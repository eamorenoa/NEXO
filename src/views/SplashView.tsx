import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type SplashViewProps = {
  onFinish?: () => void;
};

export function SplashView({ onFinish }: SplashViewProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(18)).current;

  const lineWidth = useRef(new Animated.Value(0)).current;

  const pulse = useRef(new Animated.Value(1)).current;
  const nodeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.sequence([
      // Entrada de nodos y logo
      Animated.parallel([
        Animated.timing(nodeOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),

        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),

      // Entrada del texto
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.timing(textY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Barra de progreso
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]);

    entrance.start(({ finished }) => {
      if (finished) {
        setTimeout(() => {
          onFinish?.();
        }, 350);
      }
    });

    // Pulso de los nodos
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      entrance.stop();
      pulseAnimation.stop();
    };
  }, [
    lineWidth,
    logoOpacity,
    logoScale,
    nodeOpacity,
    onFinish,
    pulse,
    textOpacity,
    textY,
  ]);

  const progressWidth = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>

      {/* Fondos decorativos */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Red de conexión */}
      <Animated.View
        style={[
          styles.network,
          {
            opacity: nodeOpacity,
          },
        ]}
      >

        {/* Conexiones */}
        <View style={[styles.connection, styles.connectionTop]} />

        <View style={[styles.connection, styles.connectionLeft]} />

        <View style={[styles.connection, styles.connectionRight]} />

        <View
          style={[
            styles.connection,
            styles.connectionBottomLeft,
          ]}
        />

        <View
          style={[
            styles.connection,
            styles.connectionBottomRight,
          ]}
        />

        {/* Nodo superior */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeTop,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        />

        {/* Nodo izquierdo */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeLeft,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        />

        {/* Nodo derecho */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeRight,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        />

        {/* Nodo inferior izquierdo */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeBottomLeft,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        />

        {/* Nodo inferior derecho */}
        <Animated.View
          style={[
            styles.node,
            styles.nodeBottomRight,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        />

      </Animated.View>

      {/* LOGO NEXO */}
      <Animated.View
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoBorder}>
          <Text style={styles.logoText}>
            N
          </Text>
        </View>
      </Animated.View>

      {/* TEXTO */}
      <Animated.View
        style={[
          styles.textArea,
          {
            opacity: textOpacity,
            transform: [{ translateY: textY }],
          },
        ]}
      >

        <Text style={styles.brand}>
          NEXO
        </Text>

        <Text style={styles.slogan}>
          Tu barrio, conectado.
        </Text>

        <Text style={styles.description}>
          Ayuda, oportunidades, servicios y recursos
        </Text>

        <Text style={styles.description}>
          más cerca de ti.
        </Text>

      </Animated.View>

      {/* CARGA */}
      <View style={styles.loadingArea}>

        <View style={styles.progressTrack}>

          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />

        </View>

        <Text style={styles.loadingText}>
          Conectando comunidad...
        </Text>

      </View>

      {/* PIE */}
      <Text style={styles.footer}>
        NEXO • Comunidad inteligente
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#FAF9FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 24,
  },

  glowTop: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#EEE7FF',
    opacity: 0.65,
    top: -185,
    right: -150,
  },

  glowBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F0E9FF',
    opacity: 0.55,
    bottom: -170,
    left: -145,
  },

  network: {
    position: 'absolute',
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    top: '25%',
  },

  connection: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#C4B5FD',
    opacity: 0.8,
  },

  connectionTop: {
    width: 92,
    top: 55,
    left: 88,
    transform: [
      {
        rotate: '-45deg',
      },
    ],
  },

  connectionLeft: {
    width: 78,
    top: 134,
    left: 48,
  },

  connectionRight: {
    width: 78,
    top: 134,
    right: 48,
  },

  connectionBottomLeft: {
    width: 90,
    bottom: 56,
    left: 84,
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },

  connectionBottomRight: {
    width: 90,
    bottom: 56,
    right: 84,
    transform: [
      {
        rotate: '-45deg',
      },
    ],
  },

  node: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#7C3AED',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 5,
  },

  nodeTop: {
    top: 8,
  },

  nodeLeft: {
    left: 13,
    top: 128,
  },

  nodeRight: {
    right: 13,
    top: 128,
  },

  nodeBottomLeft: {
    left: 53,
    bottom: 10,
  },

  nodeBottomRight: {
    right: 53,
    bottom: 10,
  },

  logo: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#6D28D9',
    alignItems: 'center',
    justifyContent: 'center',

    elevation: 12,

    shadowColor: '#6D28D9',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.25,

    shadowRadius: 16,
  },

  logoBorder: {
    width: 86,
    height: 86,
    borderRadius: 43,

    borderWidth: 2,

    borderColor: 'rgba(255,255,255,0.35)',

    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '900',
  },

  textArea: {
    alignItems: 'center',
    marginTop: 28,
  },

  brand: {
    color: '#6D28D9',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },

  slogan: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
    marginBottom: 9,
    textAlign: 'center',
  },

  description: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  loadingArea: {
    width: '70%',
    maxWidth: 280,
    alignItems: 'center',
    marginTop: 42,
  },

  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 5,
    backgroundColor: '#E6E1F0',
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#6D28D9',
  },

  loadingText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 10,
  },

  footer: {
    position: 'absolute',
    bottom: 22,
    color: '#A1A1AA',
    fontSize: 10,
    letterSpacing: 0.5,
  },

});