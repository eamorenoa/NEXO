import { useState } from 'react';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';

interface AuthSuccess {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface UseAuthViewModelProps {
  onSuccess: (session: AuthSuccess) => void;
}

export function useAuthViewModel({
  onSuccess,
}: UseAuthViewModelProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [register, setRegister] = useState(false);
  const [verification, setVerification] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);

  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const submit = async () => {
    setError('');
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes('@')) {
      setError('Usa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setError(
        'La contraseña debe tener mínimo 6 caracteres.',
      );
      return;
    }

    if (
      register &&
      (name.trim().length < 3 ||
        password !== confirmPassword)
    ) {
      setError(
        'Completa el nombre y verifica las contraseñas.',
      );
      return;
    }

    setLoading(true);

    try {
      if (register) {
        const result = await AuthService.register(
          name.trim(),
          cleanEmail,
          password,
        );

        setEmail(cleanEmail);
        setVerification(true);
        setMessage(
          result.emailSent
            ? 'Cuenta creada. Revise su correo y escriba el código de 6 dígitos.'
            : 'Cuenta creada, pero no fue posible enviar el correo. Puede intentar reenviar el código.',
        );

        return;
      }

      const session = await AuthService.login(
        cleanEmail,
        password,
      );

      onSuccess({
        user: session.user,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    } catch (e: any) {
      if (
        e?.code === 'EMAIL_NOT_VERIFIED' ||
        e?.requiresVerification
      ) {
        setVerification(true);
        setEmail(e.email || cleanEmail);
        setError(
          'Debe verificar su correo electrónico antes de ingresar.',
        );
      } else {
        setError(
          e?.message ||
          'No fue posible conectar con NEXO.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setError('');
    setMessage('');

    const code = verificationCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Escriba el código de verificación de 6 dígitos.',
      );
      return;
    }

    setLoading(true);

    try {
      await AuthService.verifyEmail(
        email.trim().toLowerCase(),
        code,
      );

      setMessage(
        'Correo verificado correctamente. Ahora puede ingresar.',
      );

      setVerification(false);
      setRegister(false);
      setVerificationCode('');
      setPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(
        e?.message ||
        'El código no es válido o ya expiró.',
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result =
        await AuthService.resendVerification(
          email.trim().toLowerCase(),
        );

      setMessage(
        result.message ||
        'Si corresponde, se ha enviado un nuevo código.',
      );
    } catch (e: any) {
      setError(
        e?.message ||
        'No fue posible reenviar el código.',
      );
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    setError('');
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes('@')) {
      setError('Usa un correo electrónico válido.');
      return;
    }

    setLoading(true);

    try {
      const result =
        await AuthService.forgotPassword(cleanEmail);

      setMessage(
        result.message ||
        'Si el correo está registrado, recibirá un código de recuperación.',
      );

      setForgotPassword(false);
      setResetPassword(true);
    } catch (e: any) {
      setError(
        e?.message ||
        'No fue posible solicitar la recuperación.',
      );
    } finally {
      setLoading(false);
    }
  };
  const confirmPasswordReset = async () => {
    setError('');
    setMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const code = verificationCode.trim();

    if (!cleanEmail.includes('@')) {
      setError('Usa un correo electrónico válido.');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError(
        'Escriba el código de recuperación de 6 dígitos.',
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        'La nueva contraseña debe tener al menos 8 caracteres.',
      );
      return;
    }

    setLoading(true);

    try {
      const result = await AuthService.resetPassword(
        cleanEmail,
        code,
        newPassword,
      );

      setMessage(
        result.message ||
        'Contraseña actualizada correctamente.',
      );

      setVerificationCode('');
      setNewPassword('');
      setForgotPassword(false);
      setResetPassword(false);
      setPassword('');
    } catch (e: any) {
      setError(
        e?.message ||
        'No fue posible actualizar la contraseña.',
      );
    } finally {
      setLoading(false);
    }
  };


  const backToLogin = () => {
    setVerification(false);
    setRegister(false);
    setVerificationCode('');
    setError('');
    setMessage('');
  };

  return {
    name,
    email,
    password,
    confirmPassword,

    register,
    verification,
    forgotPassword,
    resetPassword,

    verificationCode,
    newPassword,

    loading,
    error,
    message,

    setName,
    setEmail,
    setPassword,
    setConfirmPassword,

    setRegister,
    setForgotPassword,
    setResetPassword,
    setVerificationCode,
    setNewPassword,

    submit,
    verify,
    resend,
    requestPasswordReset,
    confirmPasswordReset,
    backToLogin,
  };
}