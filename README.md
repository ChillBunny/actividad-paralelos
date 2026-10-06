# Actividad: despliegue serverless en Google Cloud

La app móvil de la actividad 2 (React Native) y su API (Go con Gin), desplegadas en Google
Cloud con Terraform y GitHub Actions.

```
App móvil -> API Gateway -> Cloud Run -> Cloud SQL (PostgreSQL)

GitHub -> GitHub Actions -> Terraform apply -> Google Cloud
```

## Carpetas

| Carpeta | Qué tiene |
|---|---|
| `Backend/` | La API, su `Dockerfile` y `cloudbuild.yaml` (Cloud Build) |
| `Mobile/` | La app en React Native, con MVVM |
| `terraform/` | La infraestructura: Cloud Run, API Gateway, Artifact Registry, Cloud SQL, cuentas de servicio, IAM, Cloud Logging, Cloud Build, Secret Manager y el bucket de archivos |
| `.github/workflows/deploy.yml` | El pipeline que despliega todo al hacer push a `main` |

## El pipeline

1. **Backend**: instala dependencias, corre las pruebas (`go test`), compila, construye la
   imagen Docker y la publica en Artifact Registry.
2. **Terraform**: `init`, `validate`, `plan` y `apply -auto-approve`. El estado se guarda en
   un bucket de Cloud Storage.
3. **Despliegue**: `gcloud builds submit` (Cloud Build construye la imagen) y
   `gcloud run deploy` (Cloud Run pasa a la versión nueva).

## Secretos

Ninguna clave está en el código. En GitHub Secrets: `GCP_PROJECT_ID`, `GCP_REGION`,
`GCP_SA_KEY`, `DATABASE_URL`, `JWT_SECRET` y `DB_PASSWORD`. Terraform guarda `DATABASE_URL`
y `JWT_SECRET` en Secret Manager, y Cloud Run los recibe como variables de entorno.

## La app

En `Mobile/.env` va la dirección de API Gateway:

```
EXPO_PUBLIC_API_URL=https://actividad-gateway-bofez9et.uc.gateway.dev
```
