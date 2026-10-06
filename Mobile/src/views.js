import { createContext, useContext } from 'react';
import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { urlArchivo } from './services';
import { nombreCompleto } from './models';
import {
  useDashboardViewModel, useGaleriaViewModel, useLoginViewModel, useUsuarioDetalleViewModel,
  useUsuarioFormViewModel, useUsuariosViewModel,
} from './viewmodels';

// View: las pantallas, lo que comparten y los estilos. Solo muestran y le avisan al
// ViewModel lo que toca el usuario; no guardan datos ni llaman a la API

// ---------- Colores y estilos ----------

// los colores de la app en modo claro y en modo oscuro
const paletas = {
  claro: {
    fondo: '#F2F4F8', tarjeta: '#FFFFFF', borde: '#DCE1EA', texto: '#18202E', textoSuave: '#5D6778',
    principal: '#2F5BEA', sobrePrincipal: '#FFFFFF', suave: '#E3E9FD',
    peligro: '#D63C3C', sobrePeligro: '#FFFFFF', fondoError: '#FDE8E8', exito: '#178A55',
  },
  oscuro: {
    fondo: '#0E131B', tarjeta: '#19202B', borde: '#2B3444', texto: '#EEF2F8', textoSuave: '#A0AABB',
    principal: '#6B8CFF', sobrePrincipal: '#0E131B', suave: '#232E45',
    peligro: '#FF6B6B', sobrePeligro: '#0E131B', fondoError: '#3A1E22', exito: '#4CD08F',
  },
};

// el tema que se está usando. Lo pone App.js y cada pantalla lo lee con useTema()
export const TemaContext = createContext(null);
const useTema = () => useContext(TemaContext);

// los estilos cambian con los colores, por eso se arman con una función
function crearEstilos(c) {
  return StyleSheet.create({
    pantalla: { flexGrow: 1, padding: 20, paddingTop: 56, paddingBottom: 80, backgroundColor: c.fondo },
    filaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    botonChico: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 30, backgroundColor: c.suave },
    textoBotonChico: { fontSize: 17, fontWeight: 'bold', color: c.principal },
    titulo: { fontSize: 32, fontWeight: 'bold', color: c.texto, marginBottom: 24 },
    subtitulo: { fontSize: 22, fontWeight: 'bold', color: c.texto, marginTop: 28, marginBottom: 14 },
    texto: { fontSize: 18, color: c.texto, lineHeight: 26 },
    textoSuave: { fontSize: 16, color: c.textoSuave, lineHeight: 24 },
    centrado: { textAlign: 'center' },
    error: {
      fontSize: 17, color: c.peligro, backgroundColor: c.fondoError, padding: 14, borderRadius: 14, marginBottom: 16,
    },
    campo: {
      fontSize: 18, color: c.texto, backgroundColor: c.tarjeta, borderWidth: 1.5, borderColor: c.borde,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 16,
    },
    boton: {
      minHeight: 60, borderRadius: 16, paddingHorizontal: 20, marginBottom: 16, alignItems: 'center', justifyContent: 'center',
    },
    textoBoton: { fontSize: 19, fontWeight: 'bold', textAlign: 'center' },
    tarjeta: {
      backgroundColor: c.tarjeta, borderWidth: 1, borderColor: c.borde, borderRadius: 18, padding: 18, marginBottom: 16,
    },
    resaltada: { borderWidth: 2, borderColor: c.principal, backgroundColor: c.suave },
    fila: { flexDirection: 'row', gap: 12 },
    filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dato: {
      flex: 1, alignItems: 'center', backgroundColor: c.tarjeta, borderWidth: 1, borderColor: c.borde,
      borderRadius: 18, paddingVertical: 18, paddingHorizontal: 8, marginBottom: 16,
    },
    numero: { fontSize: 38, fontWeight: 'bold', color: c.principal },
    etiqueta: { fontSize: 16, color: c.textoSuave, textAlign: 'center', marginTop: 4 },
    resultado: { fontSize: 19, fontWeight: 'bold', color: c.exito, textAlign: 'center', marginBottom: 16 },
    logo: { width: 110, height: 110, alignSelf: 'center', tintColor: c.principal },
    filaUsuario: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatar: { backgroundColor: c.suave, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    iniciales: { fontWeight: 'bold', color: c.principal },
    galeria: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    miniatura: { width: '100%', aspectRatio: 1, borderRadius: 14 },
    previa: { width: 56, height: 56, borderRadius: 10 },
    marcada: { opacity: 0.4 },
    check: {
      position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
      backgroundColor: c.peligro, color: c.sobrePeligro, fontSize: 20, fontWeight: 'bold', textAlign: 'center', lineHeight: 34,
    },
  });
}

// los dos temas se arman una sola vez, al abrir la app. Cambiar de modo solo elige el otro,
// así no se rehacen todos los estilos cada vez
export const temas = {
  claro: { oscuro: false, colores: paletas.claro, estilos: crearEstilos(paletas.claro) },
  oscuro: { oscuro: true, colores: paletas.oscuro, estilos: crearEstilos(paletas.oscuro) },
};

// ---------- Lo que comparten las pantallas ----------

// el marco de cada pantalla: se puede desplazar, y arriba lleva volver, el modo y el título
function Pantalla({ titulo, onVolver, children }) {
  const { estilos, oscuro, cambiarModo } = useTema();
  return (
    <ScrollView contentContainerStyle={estilos.pantalla} keyboardShouldPersistTaps="handled">
      <View style={estilos.filaEncabezado}>
        {onVolver ? <BotonChico titulo="← Volver" onPress={onVolver} /> : <View />}
        <BotonChico titulo={oscuro ? '☀️ Claro' : '🌙 Oscuro'} onPress={cambiarModo} />
      </View>
      {titulo ? <Text style={estilos.titulo}>{titulo}</Text> : null}
      {children}
    </ScrollView>
  );
}

function BotonChico({ titulo, onPress }) {
  const { estilos } = useTema();
  return (
    <Pressable style={estilos.botonChico} onPress={onPress}>
      <Text style={estilos.textoBotonChico}>{titulo}</Text>
    </Pressable>
  );
}

// un botón grande. tipo: 'principal' (azul), 'secundario' (suave) o 'peligro' (rojo)
function Boton({ titulo, onPress, tipo = 'principal' }) {
  const { estilos, colores } = useTema();
  let fondo = colores.principal;
  let letra = colores.sobrePrincipal;
  if (tipo === 'secundario') {
    fondo = colores.suave;
    letra = colores.principal;
  } else if (tipo === 'peligro') {
    fondo = colores.peligro;
    letra = colores.sobrePeligro;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [estilos.boton, { backgroundColor: fondo, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[estilos.textoBoton, { color: letra }]}>{titulo}</Text>
    </Pressable>
  );
}

// un campo de texto que escribe en vm.campos[campo]
function Campo({ vm, campo, texto, ...otros }) {
  const { estilos, colores } = useTema();
  return (
    <TextInput
      style={estilos.campo}
      placeholder={texto}
      placeholderTextColor={colores.textoSuave}
      value={vm.campos[campo]}
      onChangeText={(valor) => vm.cambiar(campo, valor)}
      {...otros}
    />
  );
}

// el cargando y el error que vienen del ViewModel
function Estado({ vm }) {
  const { estilos, colores } = useTema();
  if (vm.cargando) {
    return <ActivityIndicator size="large" color={colores.principal} style={{ marginBottom: 16 }} />;
  }
  if (vm.error) {
    return <Text style={estilos.error}>{vm.error}</Text>;
  }
  return null;
}

// la foto del usuario en un círculo; si no tiene, sus iniciales.
// el color de fondo va en el círculo y no en la foto, para que cambiar de modo no la recargue
function Avatar({ usuario, tamano }) {
  const { estilos } = useTema();
  const circulo = { width: tamano, height: tamano, borderRadius: tamano / 2 };
  return (
    <View style={[estilos.avatar, circulo]}>
      {usuario.photo ? (
        <Image source={{ uri: urlArchivo(usuario.photo) }} style={circulo} />
      ) : (
        <Text style={[estilos.iniciales, { fontSize: tamano * 0.38 }]}>
          {(usuario.name.charAt(0) + usuario.lastName.charAt(0)).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

// un número grande con su nombre abajo
function Dato({ valor, nombre }) {
  const { estilos } = useTema();
  return (
    <View style={estilos.dato}>
      <Text style={estilos.numero}>{valor}</Text>
      <Text style={estilos.etiqueta}>{nombre}</Text>
    </View>
  );
}

// los dos tiempos, y cuántas veces más rápida fue la concurrente
function Tiempos({ secuencial, concurrente }) {
  const { estilos } = useTema();
  let resultado = '';
  if (secuencial !== null && concurrente !== null && concurrente > 0) {
    const veces = secuencial / concurrente;
    resultado = veces >= 1
      ? 'La concurrente fue ' + veces.toFixed(1) + ' veces más rápida'
      : 'Esta vez la secuencial fue más rápida';
  }
  return (
    <View>
      <View style={estilos.fila}>
        <Dato valor={secuencial === null ? '-' : secuencial} nombre="Secuencial (ms)" />
        <Dato valor={concurrente === null ? '-' : concurrente} nombre="Concurrente (ms)" />
      </View>
      {resultado ? <Text style={estilos.resultado}>{resultado}</Text> : null}
    </View>
  );
}

// pide confirmación antes de borrar, porque no se puede deshacer
function confirmar(titulo, mensaje, accion) {
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar' },
    { text: 'Borrar', style: 'destructive', onPress: accion },
  ]);
}

// abre la galería del teléfono. Devuelve las fotos elegidas, o una lista vacía si se canceló
async function elegirFotos(varias) {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: varias,
    selectionLimit: varias ? 10 : 1,
    quality: 0.5,
  });
  return resultado.canceled ? [] : resultado.assets;
}

// ---------- Login ----------

export function LoginScreen({ navegar }) {
  const vm = useLoginViewModel(() => navegar('dashboard'));
  const { estilos } = useTema();

  return (
    <Pantalla>
      <Image source={require('../assets/icon.png')} style={estilos.logo} />
      <Text style={[estilos.titulo, estilos.centrado, { marginBottom: 4 }]}>Actividad 2</Text>
      <Text style={[estilos.textoSuave, estilos.centrado, { marginBottom: 24 }]}>
        {vm.modoRegistro ? 'Crea tu cuenta para entrar' : 'Inicia sesión para continuar'}
      </Text>

      {vm.modoRegistro ? (
        <>
          <Campo vm={vm} campo="name" texto="Nombre" />
          <Campo vm={vm} campo="lastName" texto="Apellido" />
        </>
      ) : null}
      <Campo vm={vm} campo="email" texto="Email" autoCapitalize="none" keyboardType="email-address" />
      <Campo vm={vm} campo="password" texto="Contraseña" secureTextEntry />

      <Estado vm={vm} />
      {vm.cargando ? null : (
        <>
          <Boton titulo={vm.modoRegistro ? 'Registrarme' : 'Entrar'} onPress={vm.enviar} />
          <Boton
            titulo={vm.modoRegistro ? 'Ya tengo cuenta' : 'Crear una cuenta'}
            onPress={vm.cambiarModo}
            tipo="secundario"
          />
          <Text style={[estilos.textoSuave, estilos.centrado, { marginBottom: 10 }]}>
            ¿No recuerdas tu usuario?
          </Text>
          <Boton titulo="Entrar sin cuenta (super usuario)" onPress={vm.entrarSinCuenta} tipo="secundario" />
        </>
      )}
    </Pantalla>
  );
}

// ---------- Dashboard ----------

export function DashboardScreen({ navegar }) {
  const vm = useDashboardViewModel();
  const { estilos } = useTema();

  async function salir() {
    await vm.cerrarSesion();
    navegar('login');
  }

  return (
    <Pantalla titulo="Dashboard">
      {vm.datos ? (
        <>
          <Text style={[estilos.texto, { fontSize: 22, lineHeight: 30, marginBottom: 16 }]}>{vm.saludo}</Text>
          <View style={estilos.fila}>
            <Dato valor={vm.datos.estadisticas.users} nombre="Usuarios registrados" />
          </View>
        </>
      ) : null}
      <Boton titulo="Usuarios" onPress={() => navegar('usuarios')} />
      <Boton titulo="Galería" onPress={() => navegar('galeria')} />

      <Text style={estilos.subtitulo}>Cargar los 4 endpoints</Text>
      <Tiempos secuencial={vm.tiempoSecuencial} concurrente={vm.tiempoConcurrente} />
      <Estado vm={vm} />
      <Boton titulo="Uno tras otro (secuencial)" onPress={vm.cargarSecuencial} tipo="secundario" />
      <Boton titulo="Todos a la vez (concurrente)" onPress={() => vm.cargarConcurrente(true)} tipo="secundario" />

      {vm.datos ? (
        <>
          <Text style={estilos.subtitulo}>Notificaciones</Text>
          {vm.notificaciones.length === 0 ? <Text style={estilos.textoSuave}>No hay nada nuevo.</Text> : null}
          {vm.notificaciones.map((aviso, i) => (
            <View key={i} style={estilos.tarjeta}>
              <Text style={estilos.texto}>{aviso.message}</Text>
              <Text style={estilos.textoSuave}>{aviso.date.slice(0, 10)}</Text>
            </View>
          ))}
          {vm.totalNotificaciones > 3 ? (
            <Boton
              titulo={vm.verTodas ? 'Ver menos' : 'Ver todas (' + vm.totalNotificaciones + ')'}
              onPress={vm.cambiarVerTodas}
              tipo="secundario"
            />
          ) : null}
        </>
      ) : null}

      <View style={{ marginTop: 20 }}>
        <Boton titulo="Cerrar sesión" onPress={salir} tipo="peligro" />
      </View>
    </Pantalla>
  );
}

// ---------- Usuarios ----------

// la lista. Tocar uno abre su detalle
export function UsuariosScreen({ navegar }) {
  const vm = useUsuariosViewModel();
  const { estilos } = useTema();

  return (
    <Pantalla titulo="Usuarios" onVolver={() => navegar('dashboard')}>
      <Boton titulo="Nuevo usuario" onPress={() => navegar('formulario', null)} />
      <Estado vm={vm} />
      {!vm.cargando && vm.usuarios.length === 0 ? (
        <Text style={[estilos.textoSuave, estilos.centrado, { marginTop: 16 }]}>No queda ningún usuario.</Text>
      ) : null}

      {vm.usuarios.map((usuario) => (
        <Pressable key={usuario.id} style={estilos.tarjeta} onPress={() => navegar('detalle', usuario.id)}>
          <View style={estilos.filaUsuario}>
            <Avatar usuario={usuario} tamano={56} />
            <View style={{ flex: 1 }}>
              <Text style={[estilos.texto, { fontWeight: 'bold' }]}>{nombreCompleto(usuario)}</Text>
              <Text style={estilos.textoSuave}>{usuario.email}</Text>
            </View>
          </View>
        </Pressable>
      ))}
    </Pantalla>
  );
}

// el detalle: la foto y los botones para editar, cambiar la foto y eliminar. datos es el id
export function UsuarioDetalleScreen({ navegar, datos: id }) {
  const vm = useUsuarioDetalleViewModel(id);
  const { estilos } = useTema();

  async function cambiarFoto() {
    const fotos = await elegirFotos(false);
    if (fotos.length > 0) {
      vm.cambiarLaFoto(fotos[0]);
    }
  }

  function eliminar() {
    confirmar('Eliminar usuario', '¿Seguro que quieres eliminarlo?', async () => {
      if (await vm.eliminar()) {
        navegar('usuarios');
      }
    });
  }

  return (
    <Pantalla titulo="Detalle" onVolver={() => navegar('usuarios')}>
      <Estado vm={vm} />
      {vm.usuario ? (
        <>
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Avatar usuario={vm.usuario} tamano={160} />
            <Text style={[estilos.titulo, estilos.centrado, { fontSize: 28, marginTop: 16, marginBottom: 4 }]}>
              {nombreCompleto(vm.usuario)}
            </Text>
            <Text style={[estilos.texto, estilos.centrado]}>{vm.usuario.email}</Text>
            <Text style={[estilos.textoSuave, estilos.centrado]}>Creado el {vm.usuario.createdAt.slice(0, 10)}</Text>
          </View>
          <Boton titulo="Editar" onPress={() => navegar('formulario', vm.usuario)} />
          <Boton titulo="Subir o cambiar foto" onPress={cambiarFoto} tipo="secundario" />
          <View style={{ marginTop: 20 }}>
            <Boton titulo="Eliminar usuario" onPress={eliminar} tipo="peligro" />
          </View>
        </>
      ) : null}
    </Pantalla>
  );
}

// el formulario para crear un usuario (sin datos) o editarlo (datos es el usuario)
export function UsuarioFormScreen({ navegar, datos: usuario }) {
  const vm = useUsuarioFormViewModel(usuario);

  async function guardar() {
    if (await vm.guardar()) {
      navegar('usuarios');
    }
  }

  return (
    <Pantalla titulo={usuario ? 'Editar usuario' : 'Nuevo usuario'} onVolver={() => navegar('usuarios')}>
      <Campo vm={vm} campo="name" texto="Nombre" />
      <Campo vm={vm} campo="lastName" texto="Apellido" />
      <Campo vm={vm} campo="email" texto="Email" autoCapitalize="none" keyboardType="email-address" />
      <Campo
        vm={vm}
        campo="password"
        texto={usuario ? 'Contraseña nueva (opcional)' : 'Contraseña (mínimo 6)'}
        secureTextEntry
      />
      <Estado vm={vm} />
      {vm.cargando ? null : <Boton titulo="Guardar" onPress={guardar} />}
    </Pantalla>
  );
}

// ---------- Galería ----------

// se eligen varias fotos del teléfono y se suben una por una o todas a la vez.
// Las subidas se tocan para marcarlas y borrarlas
export function GaleriaScreen({ navegar }) {
  const vm = useGaleriaViewModel();
  const { estilos } = useTema();
  const hayElegidas = vm.seleccionadas.length > 0;

  async function elegir() {
    const fotos = await elegirFotos(true);
    if (fotos.length > 0) {
      vm.setSeleccionadas(fotos);
    }
  }

  function borrar(ids) {
    const cuales = ids.length === 1 ? 'esta foto' : 'estas ' + ids.length + ' fotos';
    confirmar('Borrar fotos', '¿Seguro que quieres borrar ' + cuales + '?', () => vm.borrar(ids));
  }

  return (
    <Pantalla titulo="Galería" onVolver={() => navegar('dashboard')}>
      <View style={[estilos.tarjeta, hayElegidas ? estilos.resaltada : null]}>
        <View style={estilos.filaEntre}>
          <Text style={estilos.texto}>Fotos elegidas</Text>
          <Text style={estilos.numero}>{vm.seleccionadas.length}</Text>
        </View>
        {hayElegidas ? (
          <View style={[estilos.galeria, { marginTop: 12 }]}>
            {vm.seleccionadas.map((foto) => (
              <Image key={foto.uri} source={{ uri: foto.uri }} style={estilos.previa} />
            ))}
          </View>
        ) : (
          <Text style={estilos.textoSuave}>Todavía no elegiste fotos para subir.</Text>
        )}
      </View>
      <View style={estilos.tarjeta}>
        <View style={estilos.filaEntre}>
          <Text style={estilos.texto}>Fotos subidas</Text>
          <Text style={estilos.numero}>{vm.archivos.length}</Text>
        </View>
      </View>

      <Boton titulo={hayElegidas ? 'Elegir otras fotos' : 'Elegir fotos'} onPress={elegir} />
      {hayElegidas ? (
        <Boton titulo="Quitar las elegidas" onPress={() => vm.setSeleccionadas([])} tipo="secundario" />
      ) : null}

      <Text style={estilos.subtitulo}>Subir las fotos elegidas</Text>
      <Tiempos secuencial={vm.tiempoSecuencial} concurrente={vm.tiempoConcurrente} />
      <Estado vm={vm} />
      <Boton titulo="Una por una (secuencial)" onPress={vm.subirUnaPorUna} tipo="secundario" />
      <Boton titulo="Todas a la vez (concurrente)" onPress={vm.subirTodasALaVez} tipo="secundario" />

      <Text style={estilos.subtitulo}>Mis fotos</Text>
      {vm.archivos.length === 0 ? (
        <Text style={estilos.textoSuave}>Todavía no hay fotos subidas.</Text>
      ) : (
        <>
          <Text style={[estilos.textoSuave, { marginBottom: 14 }]}>Toca las fotos que quieras borrar.</Text>
          {vm.marcadas.length > 0 ? (
            <Boton titulo={'Borrar las marcadas (' + vm.marcadas.length + ')'} onPress={() => borrar(vm.marcadas)} tipo="peligro" />
          ) : null}
          <Boton titulo="Borrar todas" onPress={() => borrar(vm.archivos.map((archivo) => archivo.id))} tipo="secundario" />
          <View style={estilos.galeria}>
            {vm.archivos.map((archivo) => {
              const marcada = vm.marcadas.includes(archivo.id);
              return (
                <Pressable key={archivo.id} style={{ width: '31%' }} onPress={() => vm.marcar(archivo.id)}>
                  <Image
                    source={{ uri: urlArchivo(archivo.url) }}
                    style={[estilos.miniatura, marcada ? estilos.marcada : null]}
                  />
                  {marcada ? <Text style={estilos.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </Pantalla>
  );
}
