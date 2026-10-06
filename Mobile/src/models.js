// Models: la forma de los datos (DTO) que van y vienen de la API.
// Usuario: { id, name, lastName, email, photo, createdAt }
// Archivo: { id, filename, url, userId, createdAt }

// arma los datos para crear o editar un usuario.
// la contraseña solo se manda si se escribió, para no borrarla al editar
export function crearDatosUsuario({ name, lastName, email, password }) {
  const datos = { name, lastName, email };
  if (password) {
    datos.password = password;
  }
  return datos;
}

export function nombreCompleto(usuario) {
  return usuario.name + ' ' + usuario.lastName;
}

// revisa una foto antes de subirla, igual que lo hace la API: que sea imagen y no pase de 5 MB
export function validarFoto(foto) {
  if (foto.mimeType && !foto.mimeType.startsWith('image/')) {
    return 'Solo se pueden subir imágenes';
  }
  if (foto.fileSize > 5 * 1024 * 1024) {
    return 'Una de las fotos pasa de 5 MB';
  }
  return null;
}
