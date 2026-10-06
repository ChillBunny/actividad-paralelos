# lo que Terraform muestra al terminar

output "url_api_gateway" {
  description = "La dirección que usa la app móvil"
  value       = "https://${google_api_gateway_gateway.api.default_hostname}"
}

output "url_cloud_run" {
  description = "La dirección directa del servicio de Cloud Run"
  value       = google_cloud_run_v2_service.api.uri
}

output "repositorio_imagenes" {
  description = "Dónde se publican las imágenes Docker"
  value       = "${var.region}-docker.pkg.dev/${var.proyecto}/${google_artifact_registry_repository.imagenes.repository_id}"
}

output "conexion_cloud_sql" {
  description = "Nombre de conexión de Cloud SQL (vacío si la base está apagada)"
  value       = var.crear_base ? google_sql_database_instance.base[0].connection_name : ""
}
