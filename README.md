# Actividad: despliegue serverless en Google Cloud

La app móvil de la actividad 2 (React Native) y su API (Go con Gin), desplegadas en Google
Cloud con Terraform y GitHub Actions.

```
App móvil -> Cloud Run (backend) -> Cloud SQL (PostgreSQL)
                  |
                  v
               Pub/Sub -> Cloud Run de notificaciones -> correo electrónico

GitHub -> GitHub Actions -> Terraform apply -> Google Cloud
```

Para mandar un correo, la app llama a `POST /notifications/send`. El backend valida los
datos y publica el mensaje en Pub/Sub; no espera a que el correo salga. Pub/Sub se lo
entrega a `notification-cloud-run`, que lo envía por SMTP y lo registra en Cloud Logging.

## Carpetas

| Carpeta | Qué tiene |
|---|---|
| `Backend/` | La API, su `Dockerfile` y `cloudbuild.yaml` (Cloud Build) |
| `Notifications/` | El servicio `notification-cloud-run`: recibe de Pub/Sub y manda el correo |
| `Mobile/` | La app en React Native, con MVVM |
| `terraform/` | La infraestructura: Cloud Run, API Gateway, Artifact Registry, Cloud SQL, cuentas de servicio, IAM, Cloud Logging, Cloud Build, Secret Manager, el bucket de archivos, Pub/Sub y la Cloud Run de notificaciones |
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
`GCP_SA_KEY`, `DATABASE_URL`, `JWT_SECRET`, `DB_PASSWORD`, `SMTP_USER` y `SMTP_PASSWORD`. Terraform guarda `DATABASE_URL`
y `JWT_SECRET` en Secret Manager, y Cloud Run los recibe como variables de entorno.

## La app

En `Mobile/.env` va la dirección del backend en Cloud Run:

```
EXPO_PUBLIC_API_URL=https://api-ycg7pjqheq-uc.a.run.app
```

API Gateway (`https://actividad-gateway-bofez9et.uc.gateway.dev`) sigue delante del mismo
backend y también funciona.
