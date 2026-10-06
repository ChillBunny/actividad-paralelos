import { useEffect, useState } from 'react';
import {
  cambiarFoto, cerrarSesion, crearUsuario, editarUsuario, eliminarArchivo, eliminarUsuario,
  entrarComoSuperUsuario, login, obtenerArchivos, obtenerEstadisticas, obtenerNotificaciones,
  obtenerPerfil, obtenerUsuario, obtenerUsuarios, registrar, subirArchivo,
} from './repositories';
import { crearDatosUsuario, nombreCompleto, validarFoto } from './models';

// ViewModel: el estado de cada pantalla (los datos, el cargando y los errores) y lo que hace
// cada botón. Cada pantalla tiene su hook use...ViewModel

// lo que repiten todos: el cargando y el error. correr() hace una tarea mostrando el cargando;
// si falla, guarda el mensaje. Devuelve true si salió bien
function useCarga() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  async function correr(tarea) {
    setCargando(true);
    setError('');
    try {
      await tarea();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setCargando(false);
    }
  }

  return { cargando, error, setError, correr };
}

// los campos de un usuario en un formulario. Empiezan vacíos o con los datos del usuario
function useCampos(usuario) {
  const [campos, setCampos] = useState({
    name: usuario ? usuario.name : '',
    lastName: usuario ? usuario.lastName : '',
    email: usuario ? usuario.email : '',
    password: '',
  });
  // cambia un solo campo y deja los demás como estaban
  const cambiar = (campo, valor) => setCampos((antes) => ({ ...antes, [campo]: valor }));
  return { campos, cambiar };
}

// ---------- Login ----------

export function useLoginViewModel(alEntrar) {
  const carga = useCarga();
  const { campos, cambiar } = useCampos(null);
  const [modoRegistro, setModoRegistro] = useState(false);

  function cambiarModo() {
    setModoRegistro(!modoRegistro);
    carga.setError('');
  }

  // si está creando cuenta, primero la registra; después entra con el email y la contraseña
  async function enviar() {
    const bien = await carga.correr(async () => {
      if (modoRegistro) {
        await registrar(crearDatosUsuario(campos));
      }
      await login(campos.email, campos.password);
    });
    if (bien) {
      alEntrar();
    }
  }

  // entra como el super usuario, por si no se recuerda ningún usuario
  async function entrarSinCuenta() {
    if (await carga.correr(entrarComoSuperUsuario)) {
      alEntrar();
    }
  }

  return { ...carga, campos, cambiar, modoRegistro, cambiarModo, enviar, entrarSinCuenta };
}

// ---------- Dashboard ----------

// pide los cuatro endpoints de dos formas, para comparar: uno tras otro (secuencial) o los
// cuatro a la vez (concurrente, con Promise.all)
export function useDashboardViewModel() {
  const carga = useCarga();
  const [datos, setDatos] = useState(null);
  const [tiempoSecuencial, setTiempoSecuencial] = useState(null);
  const [tiempoConcurrente, setTiempoConcurrente] = useState(null);
  const [verTodas, setVerTodas] = useState(false);

  // secuencial: pide uno, espera la respuesta, y recién ahí pide el siguiente
  function cargarSecuencial() {
    return carga.correr(async () => {
      const inicio = Date.now();
      const usuarios = await obtenerUsuarios();
      const perfil = await obtenerPerfil();
      const estadisticas = await obtenerEstadisticas();
      const notificaciones = await obtenerNotificaciones();
      setTiempoSecuencial(Date.now() - inicio);
      setDatos({ usuarios, perfil, estadisticas, notificaciones });
    });
  }

  // concurrente: lanza los cuatro pedidos a la vez y espera a que lleguen todos.
  // medir dice si se guarda el tiempo: al entrar se carga sin medir, para que los dos
  // tiempos empiecen vacíos y solo aparezcan al tocar los botones
  function cargarConcurrente(medir) {
    return carga.correr(async () => {
      const inicio = Date.now();
      const [usuarios, perfil, estadisticas, notificaciones] = await Promise.all([
        obtenerUsuarios(),
        obtenerPerfil(),
        obtenerEstadisticas(),
        obtenerNotificaciones(),
      ]);
      if (medir) {
        setTiempoConcurrente(Date.now() - inicio);
      }
      setDatos({ usuarios, perfil, estadisticas, notificaciones });
    });
  }

  // al entrar al dashboard, carga los cuatro a la vez, sin medir
  useEffect(() => {
    cargarConcurrente(false);
  }, []);

  // el saludo. Al super usuario, que es el profesor, uno especial; si el usuario de la
  // sesión se borró, el perfil llega vacío
  let saludo = 'Hola';
  if (datos && datos.perfil.email === 'ivan@test.com') {
    saludo = 'Saludos al mejor profesor y magíster de UTESA, ' + nombreCompleto(datos.perfil) + '.';
  } else if (datos && datos.perfil.id) {
    saludo = 'Hola, ' + nombreCompleto(datos.perfil);
  }

  // de las notificaciones se muestran las 3 últimas, o todas si se pidió
  const todas = datos ? datos.notificaciones : [];
  const notificaciones = verTodas ? todas : todas.slice(0, 3);

  return {
    ...carga, datos, saludo, tiempoSecuencial, tiempoConcurrente, cargarSecuencial, cargarConcurrente,
    notificaciones, totalNotificaciones: todas.length, verTodas, cambiarVerTodas: () => setVerTodas(!verTodas),
    cerrarSesion,
  };
}

// ---------- Usuarios ----------

// la lista
export function useUsuariosViewModel() {
  const carga = useCarga();
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    carga.correr(async () => setUsuarios(await obtenerUsuarios()));
  }, []);

  return { ...carga, usuarios };
}

// el detalle de un usuario: ver, cambiar la foto y eliminar
export function useUsuarioDetalleViewModel(id) {
  const carga = useCarga();
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    carga.correr(async () => setUsuario(await obtenerUsuario(id)));
  }, []);

  // recibe la foto que se eligió en la pantalla, la valida y la sube
  function cambiarLaFoto(foto) {
    return carga.correr(async () => {
      const problema = validarFoto(foto);
      if (problema) {
        throw new Error(problema);
      }
      setUsuario(await cambiarFoto(id, foto.uri));
    });
  }

  // devuelve true si se pudo eliminar, para que la pantalla vuelva a la lista
  const eliminar = () => carga.correr(() => eliminarUsuario(id));

  return { ...carga, usuario, cambiarLaFoto, eliminar };
}

// el formulario: crea un usuario nuevo o edita uno que ya existe
export function useUsuarioFormViewModel(usuario) {
  const carga = useCarga();
  const { campos, cambiar } = useCampos(usuario);

  // devuelve true si se pudo guardar, para que la pantalla vuelva atrás
  function guardar() {
    const datos = crearDatosUsuario(campos);
    return carga.correr(() => (usuario ? editarUsuario(usuario.id, datos) : crearUsuario(datos)));
  }

  return { ...carga, campos, cambiar, guardar };
}

// ---------- Galería ----------

// el proceso concurrente obligatorio: validar y subir varias fotos, una por una (secuencial)
// o todas a la vez (concurrente, con Promise.all), midiendo el tiempo. También borra fotos
export function useGaleriaViewModel() {
  const carga = useCarga();
  const [archivos, setArchivos] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]); // las fotos del teléfono para subir
  const [marcadas, setMarcadas] = useState([]); // los ids de las fotos subidas para borrar
  const [tiempoSecuencial, setTiempoSecuencial] = useState(null);
  const [tiempoConcurrente, setTiempoConcurrente] = useState(null);

  async function cargarArchivos() {
    setArchivos(await obtenerArchivos());
  }

  useEffect(() => {
    carga.correr(cargarArchivos);
  }, []);

  // la tarea que se repite por cada foto: validarla y subirla
  async function procesarFoto(foto) {
    const problema = validarFoto(foto);
    if (problema) {
      throw new Error(problema);
    }
    return subirArchivo(foto.uri);
  }

  // secuencial: valida y sube una foto, espera a que termine, y sigue con la siguiente
  function subirUnaPorUna() {
    return carga.correr(async () => {
      if (seleccionadas.length === 0) {
        throw new Error('Primero elige las fotos');
      }
      const inicio = Date.now();
      for (const foto of seleccionadas) {
        await procesarFoto(foto);
      }
      setTiempoSecuencial(Date.now() - inicio);
      await cargarArchivos();
    });
  }

  // concurrente: lanza todas las subidas a la vez y espera a que terminen todas
  function subirTodasALaVez() {
    return carga.correr(async () => {
      if (seleccionadas.length === 0) {
        throw new Error('Primero elige las fotos');
      }
      const inicio = Date.now();
      await Promise.all(seleccionadas.map((foto) => procesarFoto(foto)));
      setTiempoConcurrente(Date.now() - inicio);
      await cargarArchivos();
    });
  }

  // tocar una foto la marca para borrarla; tocarla otra vez la desmarca
  function marcar(id) {
    if (marcadas.includes(id)) {
      setMarcadas(marcadas.filter((otra) => otra !== id));
    } else {
      setMarcadas([...marcadas, id]);
    }
  }

  // borra varias fotos a la vez (las marcadas, o todas)
  function borrar(ids) {
    return carga.correr(async () => {
      await Promise.all(ids.map((id) => eliminarArchivo(id)));
      setMarcadas([]);
      await cargarArchivos();
    });
  }

  return {
    ...carga, archivos, seleccionadas, setSeleccionadas, marcadas, marcar, borrar,
    tiempoSecuencial, tiempoConcurrente, subirUnaPorUna, subirTodasALaVez,
  };
}
