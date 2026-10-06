# qué proveedores usa Terraform y dónde guarda su estado.
# el estado vive en un bucket de Cloud Storage, así lo comparten la computadora y GitHub Actions
terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0"
    }
    # API Gateway todavía está en el proveedor "beta" de Google
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 6.0"
    }
  }

  backend "gcs" {
    bucket = "actividad-paralelos-tfstate"
    prefix = "terraform"
  }
}

provider "google" {
  project = var.proyecto
  region  = var.region
}

provider "google-beta" {
  project = var.proyecto
  region  = var.region
}
