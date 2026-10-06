# los datos que cambian de un proyecto a otro. Los valores van en terraform.tfvars,
# y los secretos llegan desde GitHub Secrets como variables TF_VAR_...

variable "proyecto" {
  description = "ID del proyecto de Google Cloud"
  type        = string
}

variable "region" {
  description = "Región donde se crea todo"
  type        = string
  default     = "us-central1"
}

variable "servicio" {
  description = "Nombre del servicio de Cloud Run"
  type        = string
  default     = "api"
}

variable "imagen" {
  description = "Imagen con la que se crea Cloud Run la primera vez. Después la cambia gcloud run deploy"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "crear_base" {
  description = "Si se crea Cloud SQL. Cobra mientras exista, por eso se puede apagar"
  type        = bool
  default     = false
}

variable "database_url" {
  description = "Datos de conexión a la base (secreto DATABASE_URL)"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Clave para firmar los JWT (secreto JWT_SECRET)"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Contraseña del usuario de la base (secreto DB_PASSWORD)"
  type        = string
  sensitive   = true
}
