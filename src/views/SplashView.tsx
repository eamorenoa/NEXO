import { useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface SplashViewProps {
  onFinish: () => void;
}

export function SplashView({
  onFinish,
}: SplashViewProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>

      {/* Logo principal */}
      <Image
        source={require('../../assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Nombre de la aplicación */}
      <Text style={styles.title}>
        ExtraTime
        <Text style={styles.titleAccent}>
          Smart
        </Text>
      </Text>

      {/* Descripción */}
      <Text style={styles.subtitle}>
        Workforce Intelligence Platform
      </Text>

      {/* Indicador de carga */}
      <View style={styles.loadingContainer}>

        <View style={styles.loadingTrack}>
          <View style={styles.loadingProgress} />
        </View>

        <Text style={styles.loadingText}>
          Inicializando plataforma...
        </Text>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1F33',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  logo: {
    width: 230,
    height: 230,
    marginBottom: 18,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  titleAccent: {
    color: '#00A86B',
  },

  subtitle: {
    color: '#DCE6EF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 7,
    textAlign: 'center',
  },

  loadingContainer: {
    width: '78%',
    alignItems: 'center',
    marginTop: 45,
  },

  loadingTrack: {
    width: '100%',
    height: 5,
    borderRadius: 5,
    backgroundColor: '#29445D',
    overflow: 'hidden',
  },

  loadingProgress: {
    width: '65%',
    height: '100%',
    backgroundColor: '#00A86B',
    borderRadius: 5,
  },

  loadingText: {
    color: '#9FB3C5',
    fontSize: 11,
    marginTop: 10,
  },
});