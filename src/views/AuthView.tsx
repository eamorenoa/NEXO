import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { User } from '../models/User';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel';
import { colors } from '../shared/theme';

interface AuthViewProps {
  onSuccess: (user: User, token: string) => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const vm = useAuthViewModel(onSuccess);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.logo}>NEXO</Text>

        <Text style={styles.tag}>
          Tu barrio, conectado.
        </Text>

        <Text style={styles.description}>
          Ayuda, oportunidades, servicios y recursos cerca de ti.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>
          {vm.register ? 'Crear cuenta' : 'Bienvenido'}
        </Text>

        {vm.register ? (
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            value={vm.name}
            onChangeText={vm.setName}
          />
        ) : null}

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          value={vm.email}
          onChangeText={vm.setEmail}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Contraseña"
            secureTextEntry={!showPassword}
            value={vm.password}
            onChangeText={vm.setPassword}
          />

          <Pressable
            onPress={() => setShowPassword((value) => !value)}
            style={styles.showButton}
          >
            <Text style={styles.showText}>
              {showPassword ? 'Ocultar' : 'Ver'}
            </Text>
          </Pressable>
        </View>

        {vm.register ? (
          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
            secureTextEntry={!showPassword}
            value={vm.confirmPassword}
            onChangeText={vm.setConfirmPassword}
          />
        ) : null}

        {vm.error ? (
          <Text style={styles.error}>
            {vm.error}
          </Text>
        ) : null}

        <Pressable
          disabled={vm.loading}
          onPress={vm.submit}
          style={styles.button}
        >
          {vm.loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {vm.register ? 'Registrarme' : 'Ingresar'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => vm.setRegister((value) => !value)}
          style={styles.switchButton}
        >
          <Text style={styles.link}>
            {vm.register
              ? 'Ya tengo cuenta'
              : 'Crear una cuenta'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 22,
  },

  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logo: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 3,
  },

  tag: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  description: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 330,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 15,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 11,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },

  passwordContainer: {
    position: 'relative',
  },

  passwordInput: {
    paddingRight: 70,
  },

  showButton: {
    position: 'absolute',
    right: 15,
    top: 14,
  },

  showText: {
    color: colors.primary,
    fontWeight: '800',
  },

  error: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 10,
  },

  button: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  switchButton: {
    alignItems: 'center',
  },

  link: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '800',
    marginTop: 16,
  },
});