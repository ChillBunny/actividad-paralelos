import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';

// Services: todo lo que es HTTP (la dirección de la API, los encabezados, el JWT y multipart)
// y la sesión guardada en el teléfono

// la dirección de la API sale del archivo .env, no está escrita en el código
export const API_URL = process.env.EXPO_PUBLIC_API_URL;

// la dirección completa de un archivo guardado en la API, por ejemplo una foto
export function urlArchivo(ruta) {
  return API_URL + ruta;
}

// el JWT se guarda en el almacenamiento seguro del teléfono,
// así la sesión sigue abierta aunque se cierre la app
export function guardarToken(token) {
  return SecureStore.setItemAsync('token', token);
}

export function leerToken() {
  return SecureStore.getItemAsync('token');
}

export function borrarToken() {
  return SecureStore.deleteItemAsync('token');
}

// hace una petición con el JWT en el encabezado Authorization: Bearer TOKEN.
// el cuerpo va como JSON, salvo que sea un FormData (multipart).
// si la API responde con un error, lo lanza con el mensaje que mandó la API
export async function pedir(metodo, ruta, cuerpo) {
  const token = await leerToken();
  const encabezados = {};
  if (token) {
    encabezados.Authorization = 'Bearer ' + token;
  }
  if (cuerpo && !(cuerpo instanceof FormData)) {
    encabezados['Content-Type'] = 'application/json';
    cuerpo = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(API_URL + ruta, { method: metodo, headers: encabezados, body: cuerpo });
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos.error || 'Error ' + respuesta.status);
  }
  return datos;
}

// sube una foto con multipart/form-data, en el campo "archivo" que espera la API.
// En Expo 57 la foto va como un File de expo-file-system: el fetch de Expo ya no acepta
// { uri, name, type } (daba "Unsupported FormDataPart implementation")
export function subir(uri) {
  const formulario = new FormData();
  formulario.append('archivo', new File(uri));
  return pedir('POST', '/upload', formulario);
}
