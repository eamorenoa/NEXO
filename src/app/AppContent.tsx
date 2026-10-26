import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';

import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { User } from '../models/User';

import { AuthView } from '../views/AuthView';
import { SplashView } from '../views/SplashView';
import { HomeView } from '../views/HomeView';
import { NeedsView } from '../views/NeedsView';
import { CommunityView } from '../views/CommunityView';
import { MapView } from '../views/MapView';
import { ProfileView } from '../views/ProfileView';
import { AIView } from '../views/AIView';
import { EmergencyView } from '../views/EmergencyView';

import { AuthService } from '../services/AuthService';
import { setAccessTokenRefreshHandler } from '../services/api';
import { colors } from '../shared/theme';

const tabs = [
  ['home', '⌂', 'Inicio'],
  ['needs', '✦', 'Necesito'],
  ['community', '♧', 'Comunidad'],
  ['map', '⌖', 'Mapa'],
  ['profile', '○', 'Perfil'],
];

export function AppContent() {
  const [splash, setSplash] = useState(true);

  const [user, setUser] =
    useState<User | null>(null);

  const [token, setToken] =
    useState<string>();

  const [screen, setScreen] =
    useState('home');

  const [restoringSession, setRestoringSession] =
    useState(true);

  const [restoreError, setRestoreError] =
    useState(false);

  const mountedRef = useRef(true);

  /**
   * Restaura la sesión guardada.
   *
   * AuthService valida la sesión y, cuando corresponde,
   * intenta renovar los tokens.
   *
   * Si ocurre un error temporal, conserva las credenciales
   * y permite reintentar sin iniciar sesión de nuevo.
   */
  const restoreSavedSession = useCallback(async () => {
    setRestoringSession(true);
    setRestoreError(false);

    try {
      const session =
        await AuthService.restoreSession();

      if (!mountedRef.current) {
        return;
      }

      if (session) {
        setUser(session.user);
        setToken(session.accessToken);
        setScreen('home');
      }
    } catch (error) {
      console.error(
        'Error restaurando sesión:',
        error,
      );

      if (mountedRef.current) {
        setRestoreError(true);
      }
    } finally {
      if (mountedRef.current) {
        setRestoringSession(false);
      }
    }
  }, []);

  /**
   * Registra el comportamiento cuando se renueva
   * o se invalida el token de acceso.
   */
  useEffect(() => {
    return setAccessTokenRefreshHandler(
      (newAccessToken) => {
        if (newAccessToken) {
          setToken(newAccessToken);
        } else {
          setUser(null);
          setToken(undefined);
          setScreen('home');
        }
      },
    );
  }, []);

  /**
   * Restaura la sesión al iniciar la aplicación.
   */
  useEffect(() => {
    mountedRef.current = true;

    void restoreSavedSession();

    return () => {
      mountedRef.current = false;
    };
  }, [restoreSavedSession]);

  /**
   * Finaliza la pantalla de bienvenida.
   */
  const finish = useCallback(() => {
    setSplash(false);
  }, []);

  /**
   * Se ejecuta después de un inicio de sesión correcto.
   *
   * AuthService ya guardó los tokens en el almacenamiento.
   */
  const login = useCallback(
    (session: {
      user: User;
      accessToken: string;
      refreshToken: string;
    }) => {
      setUser(session.user);
      setToken(session.accessToken);
      setScreen('home');
      setRestoreError(false);
    },
    [],
  );

  /**
   * Cierra la sesión y limpia el estado de la aplicación.
   */
  const logout = useCallback(async () => {
    await AuthService.logout();

    setUser(null);
    setToken(undefined);
    setScreen('home');
    setRestoreError(false);
  }, []);

  // SPLASH

  if (splash) {
    return (
      <SplashView
        onFinish={finish}
      />
    );
  }

  // RESTAURANDO SESIÓN

  if (restoringSession) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Restaurando sesión...
        </Text>
      </View>
    );
  }

  // ERROR AL RESTAURAR LA SESIÓN

  if (restoreError && (!user || !token)) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.errorTitle}>
          No fue posible restaurar la sesión
        </Text>

        <Text style={styles.errorMessage}>
          Compruebe su conexión a Internet
          e inténtelo nuevamente.
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => {
            void restoreSavedSession();
          }}
          accessibilityRole="button"
          accessibilityLabel="Reintentar restauración de sesión"
        >
          <Text style={styles.retryButtonText}>
            Reintentar
          </Text>
        </Pressable>

        <Pressable
          style={styles.loginLinkButton}
          onPress={() => {
            setRestoreError(false);
            setUser(null);
            setToken(undefined);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.retryLink}>
            Iniciar sesión
          </Text>
        </Pressable>
      </View>
    );
  }

  // LOGIN

  if (!user || !token) {
    return (
      <AuthView
        onSuccess={login}
      />
    );
  }

  // EMERGENCIA

  if (screen === 'emergency') {
    return (
      <EmergencyView
        onClose={() => {
          setScreen('home');
        }}
      />
    );
  }

  // ASISTENTE IA

  if (screen === 'ai') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={s.root}>
          <AIView
            token={token}
            onBack={() => {
              setScreen('home');
            }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // PANTALLAS

  const content: Record<string, React.ReactNode> = {
    home: (
      <HomeView
        user={user}
        token={token}
        go={setScreen}
        onEmergency={() => {
          setScreen('emergency');
        }}
        onAI={() => {
          setScreen('ai');
        }}
      />
    ),

    needs: (
      <NeedsView
        token={token}
        onBack={() => {
          setScreen('home');
        }}
      />
    ),

    community: (
      <CommunityView
        token={token}
      />
    ),

    map: (
      <MapView />
    ),

    profile: (
      <ProfileView
        user={user}
        token={token}
        logout={logout}
      />
    ),
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <View style={s.body}>
          {content[screen] || content.home}
        </View>

        {/* BARRA DE NAVEGACIÓN */}

        <View style={s.nav}>
          {tabs.map(([key, icon, label]) => (
            <Pressable
              key={key}
              onPress={() => {
                setScreen(key);
              }}
              style={s.tab}
            >
              <Text
                style={[
                  s.icon,
                  screen === key && s.active,
                ]}
              >
                {icon}
              </Text>

              <Text
                style={[
                  s.label,
                  screen === key && s.active,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* BOTÓN + */}

        <Pressable
          onPress={() => {
            setScreen('needs');
          }}
          style={s.fab}
          accessibilityRole="button"
          accessibilityLabel="Crear una publicación"
        >
          <Text style={s.plus}>
            +
          </Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ESTILOS DE CARGA Y AUTENTICACIÓN

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  loadingText: {
    marginTop: 12,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },

  errorMessage: {
    marginTop: 12,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  loginLinkButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  retryLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

// ESTILOS PRINCIPALES DE LA APLICACIÓN

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  body: {
    flex: 1,
  },

  nav: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
  },

  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },

  icon: {
    fontSize: 20,
    color: '#9CA3AF',
  },

  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 3,
  },

  active: {
    color: colors.primary,
  },

  fab: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
    elevation: 9,
  },

  plus: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },
});