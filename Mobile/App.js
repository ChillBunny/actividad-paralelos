import { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { haySesion } from './src/repositories';
import {
  DashboardScreen, GaleriaScreen, LoginScreen, TemaContext, temas,
  UsuarioDetalleScreen, UsuarioFormScreen, UsuariosScreen,
} from './src/views';

// las pantallas de la app, por nombre
const pantallas = {
  login: LoginScreen,
  dashboard: DashboardScreen,
  usuarios: UsuariosScreen,
  detalle: UsuarioDetalleScreen,
  formulario: UsuarioFormScreen,
  galeria: GaleriaScreen,
};

// la navegación: guarda qué pantalla se ve y con qué datos (un id o un usuario).
// cada pantalla recibe la función navegar para pasar a otra.
// también guarda si la app está en modo claro u oscuro
function App() {
  const [pantalla, setPantalla] = useState(null);
  const modoDelTelefono = useColorScheme();
  const [oscuro, setOscuro] = useState(modoDelTelefono === 'dark');

  // al abrir la app, si hay un token guardado entra directo al dashboard
  useEffect(() => {
    haySesion().then((hay) => setPantalla({ nombre: hay ? 'dashboard' : 'login' }));
  }, []);

  function navegar(nombre, datos) {
    setPantalla({ nombre, datos });
  }

  // empieza como esté el teléfono, y el botón de arriba de cada pantalla elige el otro tema
  const tema = { ...(oscuro ? temas.oscuro : temas.claro), cambiarModo: () => setOscuro(!oscuro) };
  const colores = tema.colores;

  let contenido = <ActivityIndicator style={{ flex: 1 }} size="large" color={colores.principal} />;
  if (pantalla) {
    const Vista = pantallas[pantalla.nombre];
    contenido = <Vista navegar={navegar} datos={pantalla.datos} />;
  }

  return (
    <TemaContext.Provider value={tema}>
      <View style={{ flex: 1, backgroundColor: colores.fondo }}>
        {contenido}
        <StatusBar style={oscuro ? 'light' : 'dark'} />
      </View>
    </TemaContext.Provider>
  );
}

// le dice a Expo que esta es la app que tiene que mostrar
registerRootComponent(App);
