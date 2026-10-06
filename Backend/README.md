# Backend: API en Go con Gin

API REST con login JWT, CRUD de usuarios y subida de archivos. Guarda los datos en PostgreSQL.
La API y la base corren en Docker.

## Cómo levantarlo

1. Copiar `.env.example` como `.env` (ahí van las claves; no están en el código).
2. Con Docker Desktop abierto, en esta carpeta:

```
docker compose up -d --build
```

La API queda en `http://localhost:8080` y la base en el puerto 5433 de la computadora.
Para comprobar que responde: `http://localhost:8080/` devuelve `{"mensaje":"API funcionando"}`.

Para apagarlo: `docker compose down`.

## Archivos

| Archivo | Qué tiene |
|---|---|
| `main.go` | Todo el código, por secciones: las tablas `users` y `files` (GORM), las rutas, la conexión a PostgreSQL, registro, login y JWT, el CRUD de usuarios, los archivos y el dashboard |
| `ivan.jpg` | La foto del super usuario |
| `Dockerfile` | Cómo se construye la imagen de la API |
| `docker-compose.yml` | Levanta la API y la base juntas |

## Endpoints

Los que dicen "sí" necesitan el encabezado `Authorization: Bearer TOKEN`.

| Método y ruta | Token | Qué hace |
|---|---|---|
| `GET /` | No | Comprueba que la API responde |
| `POST /register` | No | Crea un usuario (name, lastName, email, password) |
| `POST /login` | No | Devuelve el JWT y el usuario |
| `POST /login/super` | No | Entra como el super usuario, Iván Mendoza, sin contraseña (lo crea si no existe) |
| `GET /users` | Sí | Lista los usuarios |
| `GET /users/:id` | Sí | Un usuario |
| `POST /users` | Sí | Crea un usuario |
| `PUT /users/:id` | Sí | Edita un usuario, incluida la foto |
| `DELETE /users/:id` | Sí | Borra un usuario |
| `GET /files` | Sí | Los archivos del usuario del token |
| `POST /upload` | Sí | Sube un archivo (campo `archivo`, multipart) |
| `DELETE /upload/:id` | Sí | Borra un archivo |
| `GET /profile` | Sí | El usuario del token |
| `GET /stats` | Sí | Cuántos usuarios hay y cuántos archivos se subieron entre todos |
| `GET /notifications` | Sí | Últimos registros y subidas, del más nuevo al más viejo |
| `GET /uploads/nombre` | No | Muestra un archivo subido |
