# la infraestructura de la app en Google Cloud:
# app móvil -> API Gateway -> Cloud Run -> Cloud SQL (PostgreSQL)

# ---------- APIs del proyecto ----------

# Google Cloud pide activar cada servicio antes de usarlo
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "apigateway.googleapis.com",
    "servicemanagement.googleapis.com",
    "servicecontrol.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "logging.googleapis.com",
    "iam.googleapis.com",
    "pubsub.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ---------- Artifact Registry: el repositorio de imágenes Docker ----------

resource "google_artifact_registry_repository" "imagenes" {
  location      = var.region
  repository_id = "imagenes"
  format        = "DOCKER"
  description   = "Imágenes de la API"
  depends_on    = [google_project_service.apis]
}

# ---------- Service accounts y roles IAM ----------

# la identidad con la que corre la API en Cloud Run
resource "google_service_account" "api" {
  account_id   = "api-cloud-run"
  display_name = "API en Cloud Run"
}

# la identidad con la que Cloud Build construye la imagen
resource "google_service_account" "cloud_build" {
  account_id   = "cloud-build"
  display_name = "Cloud Build"
}

# la API puede conectarse a Cloud SQL, leer los secretos y escribir logs
resource "google_project_iam_member" "api" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
  ])
  project = var.proyecto
  role    = each.value
  member  = "serviceAccount:${google_service_account.api.email}"
}

# Cloud Build puede leer el código subido, publicar imágenes y escribir logs
resource "google_project_iam_member" "cloud_build" {
  for_each = toset([
    "roles/storage.objectViewer",
    "roles/artifactregistry.writer",
    "roles/logging.logWriter",
  ])
  project = var.proyecto
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloud_build.email}"
}

# ---------- Secret Manager ----------

resource "google_secret_manager_secret" "database_url" {
  secret_id = "DATABASE_URL"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "JWT_SECRET"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}

# ---------- Cloud SQL: PostgreSQL ----------

# la instancia más pequeña. count = 0 si crear_base es false, para no pagarla mientras se prueba
resource "google_sql_database_instance" "base" {
  count               = var.crear_base ? 1 : 0
  name                = "actividad-db"
  database_version    = "POSTGRES_17"
  region              = var.region
  deletion_protection = false

  settings {
    edition           = "ENTERPRISE"
    tier              = "db-f1-micro"
    availability_type = "ZONAL"
    disk_type         = "PD_HDD"
    disk_size         = 10

    backup_configuration {
      enabled = false
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "base" {
  count    = var.crear_base ? 1 : 0
  name     = "actividad2"
  instance = google_sql_database_instance.base[0].name
}

resource "google_sql_user" "app" {
  count    = var.crear_base ? 1 : 0
  name     = "app"
  instance = google_sql_database_instance.base[0].name
  password = var.db_password

  # al apagar la base no se borra el usuario por separado (es dueño de las tablas y
  # PostgreSQL no lo deja): desaparece junto con la instancia
  deletion_policy = "ABANDON"
}

# ---------- Storage Bucket: los archivos subidos ----------

# Cloud Run lo monta como la carpeta uploads, así las fotos no se pierden al apagarse
resource "google_storage_bucket" "archivos" {
  name                        = "${var.proyecto}-archivos"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true
}

resource "google_storage_bucket_iam_member" "api" {
  bucket = google_storage_bucket.archivos.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.api.email}"
}

# ---------- Cloud Run: la API ----------

resource "google_cloud_run_v2_service" "api" {
  name                = var.servicio
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account       = google_service_account.api.email
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2" # hace falta para montar el bucket

    # se apaga cuando nadie la usa (0) y crece hasta 2 copias
    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = var.imagen

      ports {
        container_port = 8080
      }

      # los secretos llegan como variables de entorno, leídos de Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }

      # dónde publica el backend los correos por enviar
      env {
        name  = "GCP_PROJECT_ID"
        value = var.proyecto
      }
      env {
        name  = "PUBSUB_TOPIC"
        value = google_pubsub_topic.notificaciones.name
      }

      volume_mounts {
        name       = "archivos"
        mount_path = "/app/uploads"
      }

      # Cloud SQL se conecta por /cloudsql, solo si la base existe
      dynamic "volume_mounts" {
        for_each = var.crear_base ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }

    volumes {
      name = "archivos"
      gcs {
        bucket    = google_storage_bucket.archivos.name
        read_only = false
      }
    }

    dynamic "volumes" {
      for_each = var.crear_base ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.base[0].connection_name]
        }
      }
    }
  }

  # la imagen la cambia "gcloud run deploy" en cada despliegue, no Terraform
  lifecycle {
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }

  # espera también a la base y a su usuario: si la API arranca antes, no puede entrar
  depends_on = [
    google_project_iam_member.api,
    google_secret_manager_secret_version.database_url,
    google_secret_manager_secret_version.jwt_secret,
    google_storage_bucket_iam_member.api,
    google_sql_database.base,
    google_sql_user.app,
  ]
}

# cualquiera puede llamar a la API; la seguridad la pone el JWT de la propia API
resource "google_cloud_run_v2_service_iam_member" "publico" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------- API Gateway: la puerta de entrada de la app ----------

resource "google_api_gateway_api" "api" {
  provider   = google-beta
  api_id     = "actividad-api"
  depends_on = [google_project_service.apis]
}

# la configuración sale de openapi.yaml, con la dirección de Cloud Run adentro
resource "google_api_gateway_api_config" "api" {
  provider             = google-beta
  api                  = google_api_gateway_api.api.api_id
  api_config_id_prefix = "config-"

  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(templatefile("${path.module}/openapi.yaml", { url_cloud_run = google_cloud_run_v2_service.api.uri }))
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_api_gateway_gateway" "api" {
  provider   = google-beta
  gateway_id = "actividad-gateway"
  api_config = google_api_gateway_api_config.api.id
  region     = var.region
}

# ---------- Cloud Logging ----------

# cuenta los errores que escribe la API, para verlos en Cloud Logging y Monitoring
resource "google_logging_metric" "errores_api" {
  name   = "errores-api"
  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${var.servicio}\" AND severity>=ERROR"

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }

  depends_on = [google_project_service.apis]
}

# ---------- Pub/Sub: la cola de correos ----------

# el tema donde el backend publica cada correo por enviar
resource "google_pubsub_topic" "notificaciones" {
  name       = "notificaciones"
  depends_on = [google_project_service.apis]
}

# el backend tiene permiso para publicar en el tema
resource "google_pubsub_topic_iam_member" "api_publica" {
  topic  = google_pubsub_topic.notificaciones.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.api.email}"
}

# la suscripción: Pub/Sub empuja (push) cada mensaje del tema a la Cloud Run de
# notificaciones. Si responde con error, lo reintenta durante 10 minutos
resource "google_pubsub_subscription" "notificaciones" {
  name                       = "notificaciones-a-cloud-run"
  topic                      = google_pubsub_topic.notificaciones.id
  ack_deadline_seconds       = 30
  message_retention_duration = "600s"

  push_config {
    push_endpoint = google_cloud_run_v2_service.notificaciones.uri
    oidc_token {
      service_account_email = google_service_account.pubsub.email
    }
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "60s"
  }

  depends_on = [google_cloud_run_v2_service_iam_member.pubsub_invoca]
}

# ---------- Cloud Run de notificaciones ----------

# la identidad con la que corre el servicio de notificaciones
resource "google_service_account" "notificaciones" {
  account_id   = "notification-cloud-run"
  display_name = "Cloud Run de notificaciones"
}

# puede leer la contraseña del correo y escribir logs
resource "google_project_iam_member" "notificaciones" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
  ])
  project = var.proyecto
  role    = each.value
  member  = "serviceAccount:${google_service_account.notificaciones.email}"
}

# la contraseña de la cuenta de correo (SMTP) va en Secret Manager
resource "google_secret_manager_secret" "smtp_password" {
  secret_id = "SMTP_PASSWORD"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "smtp_password" {
  secret      = google_secret_manager_secret.smtp_password.id
  secret_data = var.smtp_password
}

resource "google_cloud_run_v2_service" "notificaciones" {
  name                = "notification-cloud-run"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.notificaciones.email

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = var.imagen

      ports {
        container_port = 8080
      }

      # el servidor de correo de Gmail y la cuenta que envía
      env {
        name  = "SMTP_HOST"
        value = "smtp.gmail.com"
      }
      env {
        name  = "SMTP_PORT"
        value = "587"
      }
      env {
        name  = "SMTP_USER"
        value = var.smtp_user
      }
      env {
        name = "SMTP_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.smtp_password.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  # la imagen la cambia "gcloud run deploy" en cada despliegue, no Terraform
  lifecycle {
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }

  depends_on = [
    google_project_iam_member.notificaciones,
    google_secret_manager_secret_version.smtp_password,
  ]
}

# la identidad con la que Pub/Sub llama a la Cloud Run de notificaciones.
# este servicio no es público: solo esa cuenta puede invocarlo
resource "google_service_account" "pubsub" {
  account_id   = "pubsub-invoker"
  display_name = "Pub/Sub llama a notificaciones"
}

resource "google_cloud_run_v2_service_iam_member" "pubsub_invoca" {
  name     = google_cloud_run_v2_service.notificaciones.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.pubsub.email}"
}

# Logger: cuenta los correos enviados que registra el servicio de notificaciones
resource "google_logging_metric" "correos_enviados" {
  name   = "correos-enviados"
  filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"notification-cloud-run\" AND jsonPayload.message:\"correo enviado\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }

  depends_on = [google_project_service.apis]
}
