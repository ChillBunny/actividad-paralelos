import { borrarToken, guardarToken, leerToken, pedir, subir } from './services';

// Repository: qué datos se le piden a la API. Obtener, crear, actualizar, eliminar y subir

// ---------- La sesión ----------

// entra con email y contraseña, o como el super usuario, y guarda el token que devuelve
async function entrar(ruta, cuerpo) {
  const datos = await pedir('POST', ruta, cuerpo);
  await guardarToken(datos.token);
  return datos.user;
}

export const login = (email, password) => entrar('/login', { email, password });
// manda {} aunque la API no lo use: Google rechaza un POST sin cuerpo (error 411)
export const entrarComoSuperUsuario = () => entrar('/login/super', {});
export const registrar = (datos) => pedir('POST', '/register', datos);
export const cerrarSesion = () => borrarToken();

// hay sesión si hay un token guardado
export async function haySesion() {
  return (await leerToken()) !== null;
}

// ---------- Usuarios ----------

export const obtenerUsuarios = () => pedir('GET', '/users');
export const obtenerUsuario = (id) => pedir('GET', '/users/' + id);
export const crearUsuario = (datos) => pedir('POST', '/users', datos);
export const editarUsuario = (id, datos) => pedir('PUT', '/users/' + id, datos);
export const eliminarUsuario = (id) => pedir('DELETE', '/users/' + id);

// cambiar la foto son dos pasos: subir el archivo y guardar su dirección en el usuario
export async function cambiarFoto(id, uri) {
  const subido = await subir(uri);
  return editarUsuario(id, { photo: subido.url });
}

// ---------- Dashboard ----------

export const obtenerPerfil = () => pedir('GET', '/profile');
export const obtenerEstadisticas = () => pedir('GET', '/stats');
export const obtenerNotificaciones = () => pedir('GET', '/notifications');

// ---------- Archivos ----------

export const obtenerArchivos = () => pedir('GET', '/files');
export const subirArchivo = (uri) => subir(uri);
export const eliminarArchivo = (id) => pedir('DELETE', '/upload/' + id);
