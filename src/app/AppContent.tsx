import { useCallback, useState } from 'react';

import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

  const finish = useCallback(() => {
    setSplash(false);
  }, []);

  const login = useCallback(
    (u: User, t: string) => {
      setUser(u);
      setToken(t);
      setScreen('home');
    },
    []
  );

  const logout = () => {
    setUser(null);
    setToken(undefined);
    setScreen('home');
  };

  // SPLASH

  if (splash) {
    return (
      <SplashView
        onFinish={finish}
      />
    );
  }

  // LOGIN

  if (!user) {
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
        onClose={() =>
          setScreen('home')
        }
      />
    );
  }

  // ASISTENTE IA

  if (screen === 'ai') {
    return (
      <SafeAreaView style={s.root}>
        <AIView
          token={token}
          onBack={() =>
            setScreen('home')
          }
        />
      </SafeAreaView>
    );
  }

  // PANTALLAS

  const content: Record<
    string,
    React.ReactNode
  > = {
    home: (
      <HomeView
        user={user}
        go={setScreen}
        onEmergency={() =>
          setScreen('emergency')
        }
        onAI={() =>
          setScreen('ai')
        }
      />
    ),

    needs: (
      <NeedsView
        token={token}
        onBack={() =>
          setScreen('home')
        }
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
        logout={logout}
      />
    ),
  };

  return (
    <SafeAreaView style={s.root}>

      <View style={s.body}>
        {content[screen] ||
          content.home}
      </View>

      {/* BARRA DE NAVEGACIÓN */}

      <View style={s.nav}>
        {tabs.map(
          ([key, icon, label]) => (
            <Pressable
              key={key}
              onPress={() =>
                setScreen(key)
              }
              style={s.tab}
            >
              <Text
                style={[
                  s.icon,
                  screen === key &&
                    s.active,
                ]}
              >
                {icon}
              </Text>

              <Text
                style={[
                  s.label,
                  screen === key &&
                    s.active,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          )
        )}
      </View>

      {/* BOTÓN + */}

      <Pressable
        onPress={() =>
          setScreen('needs')
        }
        style={s.fab}
      >
        <Text style={s.plus}>
          +
        </Text>
      </Pressable>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor:
      colors.background,
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
    justifyContent:
      'space-around',
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
    bottom: 38,
    left: '50%',
    marginLeft: -27,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    borderWidth: 4,
    borderColor:
      colors.background,
    elevation: 9,
  },

  plus: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 32,
  },
});