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
  onSuccess: (session: {
    user: User;
    accessToken: string;
    refreshToken: string;
  }) => void;
}

export function AuthView({
  onSuccess,
}: AuthViewProps) {
  const vm = useAuthViewModel({ onSuccess });

  const [showPassword, setShowPassword] =
    useState(false);

  if (vm.resetPassword) {
    return (
      <View style={styles.screen}>
        <View style={styles.brand}>
          <Text style={styles.logo}>NEXO</Text>

          <Text style={styles.tag}>
            Cambiar contraseña
          </Text>

          <Text style={styles.description}>
            Ingrese el código que recibió en su correo
            y establezca una nueva contraseña.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>
            Nueva contraseña
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder="Código de 6 dígitos"
            keyboardType="number-pad"
            maxLength={6}
            value={vm.verificationCode}
            onChangeText={vm.setVerificationCode}
          />

          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            secureTextEntry
            value={vm.newPassword}
            onChangeText={vm.setNewPassword}
          />

          {vm.error ? (
            <Text style={styles.error}>
              {vm.error}
            </Text>
          ) : null}

          {vm.message ? (
            <Text style={styles.success}>
              {vm.message}
            </Text>
          ) : null}

          <Pressable
            disabled={vm.loading}
            onPress={vm.confirmPasswordReset}
            style={styles.button}
          >
            {vm.loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Cambiar contraseña
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={vm.backToLogin}
            style={styles.switchButton}
          >
            <Text style={styles.link}>
              Volver al inicio de sesión
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (vm.forgotPassword) {
    return (
      <View style={styles.screen}>
        <View style={styles.brand}>
          <Text style={styles.logo}>NEXO</Text>

          <Text style={styles.tag}>
            Recuperar contraseña
          </Text>

          <Text style={styles.description}>
            Ingrese su correo electrónico y recibirá
            un código para recuperar su cuenta.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>
            Recuperación de contraseña
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={vm.email}
            onChangeText={vm.setEmail}
          />

          {vm.error ? (
            <Text style={styles.error}>
              {vm.error}
            </Text>
          ) : null}

          {vm.message ? (
            <Text style={styles.success}>
              {vm.message}
            </Text>
          ) : null}

          <Pressable
            disabled={vm.loading}
            onPress={vm.requestPasswordReset}
            style={styles.button}
          >
            {vm.loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Enviar código
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={vm.backToLogin}
            style={styles.switchButton}
          >
            <Text style={styles.link}>
              Volver al inicio de sesión
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
  if (vm.verification) {
    return (
      <View style={styles.screen}>
        <View style={styles.brand}>
          <Text style={styles.logo}>NEXO</Text>

          <Text style={styles.tag}>
            Verifique su correo
          </Text>

          <Text style={styles.description}>
            Hemos enviado un código de 6 dígitos a:
          </Text>

          <Text style={styles.emailText}>
            {vm.email}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>
            Código de verificación
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={vm.verificationCode}
            onChangeText={vm.setVerificationCode}
          />

          {vm.error ? (
            <Text style={styles.error}>
              {vm.error}
            </Text>
          ) : null}

          {vm.message ? (
            <Text style={styles.success}>
              {vm.message}
            </Text>
          ) : null}

          <Pressable
            disabled={vm.loading}
            onPress={vm.verify}
            style={styles.button}
          >
            {vm.loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Verificar correo
              </Text>
            )}
          </Pressable>

          <Pressable
            disabled={vm.loading}
            onPress={vm.resend}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              Reenviar código
            </Text>
          </Pressable>

          <Pressable
            onPress={vm.backToLogin}
            style={styles.switchButton}
          >
            <Text style={styles.link}>
              Volver al inicio de sesión
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.logo}>NEXO</Text>

        <Text style={styles.tag}>
          Tu barrio, conectado.
        </Text>

        <Text style={styles.description}>
          Ayuda, oportunidades, servicios y recursos
          cerca de ti.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>
          {vm.register
            ? 'Crear cuenta'
            : 'Bienvenido'}
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
            style={[
              styles.input,
              styles.passwordInput,
            ]}
            placeholder="Contraseña"
            secureTextEntry={!showPassword}
            value={vm.password}
            onChangeText={vm.setPassword}
          />

          <Pressable
            onPress={() =>
              setShowPassword((value) => !value)
            }
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

        {vm.message ? (
          <Text style={styles.success}>
            {vm.message}
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
              {vm.register
                ? 'Registrarme'
                : 'Ingresar'}
            </Text>
          )}
        </Pressable>

        {!vm.register ? (
          <Pressable
            onPress={() => {
              vm.setForgotPassword(true);
            }}
            style={styles.switchButton}
          >
            <Text style={styles.link}>
              ¿Olvidó su contraseña?
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() =>
            vm.setRegister((value) => !value)
          }
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

  emailText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
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

  codeInput: {
    height: 60,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 15,
    color: colors.text,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
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

  success: {
    color: '#16803C',
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

  secondaryButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  secondaryText: {
    color: colors.primary,
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
