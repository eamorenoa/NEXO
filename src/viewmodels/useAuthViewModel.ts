import { useState } from 'react';
import { User } from '../models/User';
import { AuthService } from '../services/AuthService';

export function useAuthViewModel(onSuccess: (user: User, token: string) => void) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState(''); const [register, setRegister] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const submit = async () => {
    setError(''); if (!email.includes('@') || password.length < 6) return setError('Usa un correo válido y una contraseña de mínimo 6 caracteres.');
    if (register && (name.trim().length < 3 || password !== confirmPassword)) return setError('Completa el nombre y verifica las contraseñas.');
    setLoading(true); try { const result = register ? await AuthService.register(name, email, password) : await AuthService.login(email, password); onSuccess(result.user, result.token); } catch (e: any) { setError(e.message || 'No fue posible conectar con NEXO.'); } finally { setLoading(false); }
  };
  return { name, email, password, confirmPassword, register, loading, error, setName, setEmail, setPassword, setConfirmPassword, setRegister, submit };
}
