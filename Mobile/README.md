# Mobile: app en React Native con Expo

App para Android que consume la API del backend: login con JWT, CRUD de usuarios con foto,
un dashboard y una galería. Compara la forma secuencial y la concurrente en dos procesos.

## Cómo correrla

1. Levantar el backend (ver `Backend/README.md`).
2. Copiar `.env.example` como `.env` y poner la dirección IP de la computadora donde corre la
   API (se ve con `ipconfig`, en "Dirección IPv4"). Ejemplo:
   `EXPO_PUBLIC_API_URL=http://10.0.0.107:8080`
3. Instalar las dependencias y arrancar:

```
npm install
npx expo start
```

4. En el teléfono, abrir **Expo Go** y escanear el código QR. El teléfono y la computadora
   tienen que estar en la misma red WiFi.

## Estructura (MVVM)

Un archivo por capa:

```
App.js                  arranque, navegación entre pantallas y modo claro/oscuro
src/
  views.js              View: las pantallas, los botones y los estilos
  viewmodels.js         ViewModel: estado, cargando, errores y resultados de cada pantalla
  repositories.js       Repository: obtener, crear, actualizar, eliminar y subir
  services.js           Services: HTTP, encabezados, JWT, multipart y la sesión
  models.js             Models: la forma de los datos (DTO) y su validación
```

El flujo de una acción es: la View llama al ViewModel, el ViewModel al Repository, el
Repository al Service, y el Service hace la petición a la API.

## Concurrencia

- **Dashboard**: pide `GET /users`, `GET /profile`, `GET /stats` y `GET /notifications`
  uno tras otro o los cuatro a la vez con `Promise.all`, y muestra los dos tiempos.
- **Galería**: valida y sube varias fotos una por una o todas a la vez con `Promise.all`,
  y muestra los dos tiempos. Las fotos subidas se marcan tocándolas y se borran juntas.
