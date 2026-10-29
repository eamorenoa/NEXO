import { SessionStorage } from './SessionStorage';
import { api, AuthResponse } from './api';
import { User } from '../models/User';

const ACCESS_TOKEN_KEY = 'nexo_access_token';
const REFRESH_TOKEN_KEY = 'nexo_refresh_token';
const USER_KEY = 'nexo_user';

export interface Session {
    user: User;
    accessToken: string;
    refreshToken: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VERIFICATION_CODE_PATTERN = /^\d{6}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function normalizeEmail(email: string): string {
    if (typeof email !== 'string') {
        throw new Error('El correo electrónico es obligatorio.');
    }

    const normalized = email.trim().toLowerCase();
    if (
        normalized.length > 150 ||
        !EMAIL_PATTERN.test(normalized)
    ) {
        throw new Error('Usa un correo electrónico válido.');
    }

    return normalized;
}

function validatePassword(password: string, field = 'La contraseña'): void {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
            `${field} debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
        );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error(
            `${field} no puede superar ${MAX_PASSWORD_LENGTH} caracteres.`,
        );
    }

    const utf8Bytes = new TextEncoder().encode(password).length;
    if (utf8Bytes > 72) {
        throw new Error(
            `${field} no puede superar los 72 bytes UTF-8 por compatibilidad con bcrypt.`,
        );
    }
}


function validateVerificationCode(code: string): string {
    if (typeof code !== 'string') {
        throw new Error('Escriba el código de 6 dígitos.');
    }

    const normalized = code.trim();
    if (!VERIFICATION_CODE_PATTERN.test(normalized)) {
        throw new Error('Escriba el código de 6 dígitos.');
    }

    return normalized;
}

async function saveSession(response: AuthResponse): Promise<Session> {
    if (
        typeof response?.accessToken !== 'string' ||
        !response.accessToken ||
        typeof response?.refreshToken !== 'string' ||
        !response.refreshToken
    ) {
        throw new Error('La respuesta de autenticación no contiene tokens válidos.');
    }

    let user = response.user;

    if (!user) {
        const currentUser = await api.me(response.accessToken);
        user = currentUser.user;
    }

    if (!user || typeof user !== 'object' || !user.id) {
        throw new Error('No se recibió un usuario válido al restaurar la sesión.');
    }

    // Evita dejar una sesión parcialmente guardada si falla una escritura.
    try {
        await SessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
        await SessionStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        await SessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error: unknown) {
        try {
            await clearSession();
        } catch {
            // Se conserva el error original de almacenamiento.
        }
        throw error;
    }

    return {
        user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
    };
}

async function clearSession(): Promise<void> {
    // Intenta eliminar todas las claves aunque falle una operación.
    const results = await Promise.allSettled([
        SessionStorage.deleteItem(ACCESS_TOKEN_KEY),
        SessionStorage.deleteItem(REFRESH_TOKEN_KEY),
        SessionStorage.deleteItem(USER_KEY),
    ]);

    const failed = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    if (failed) {
        throw failed.reason;
    }
}

async function login(
    email: string,
    password: string,
): Promise<Session> {
    const normalizedEmail = normalizeEmail(email);
    if (typeof password !== 'string' || password.length === 0) {
        throw new Error('La contraseña es obligatoria.');
    }

    const response = await api.login(normalizedEmail, password);
    return saveSession(response);
}

async function register(
    name: string,
    email: string,
    password: string,
) {
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    if (normalizedName.length < 3 || normalizedName.length > 120) {
        throw new Error('El nombre debe tener entre 3 y 120 caracteres.');
    }

    const normalizedEmail = normalizeEmail(email);
    validatePassword(password);
    return api.register(normalizedName, normalizedEmail, password);
}

async function verifyEmail(
    email: string,
    code: string,
) {
    return api.verifyEmail(
        normalizeEmail(email),
        validateVerificationCode(code),
    );
}

async function forgotPassword(email: string) {
    return api.forgotPassword(normalizeEmail(email));
}

async function resetPassword(
    email: string,
    code: string,
    newPassword: string,
) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = validateVerificationCode(code);
    validatePassword(newPassword, 'La nueva contraseña');

    return api.resetPassword(
        normalizedEmail,
        normalizedCode,
        newPassword,
    );
}

async function resendVerification(email: string) {
    return api.resendVerification(normalizeEmail(email));
}

async function restoreSession(): Promise<Session | null> {
    const accessToken =
        await SessionStorage.getItem(ACCESS_TOKEN_KEY);

    const refreshToken =
        await SessionStorage.getItem(REFRESH_TOKEN_KEY);

    if (!accessToken || !refreshToken) {
        await clearSession();
        return null;
    }

    try {
        // El cliente API renueva automáticamente el token
        // si el backend responde TOKEN_EXPIRED.
        const response = await api.me(accessToken);
        const user = response.user;

        // La renovación puede haber cambiado ambos tokens.
        // Leemos los valores actuales del almacenamiento.
        const currentAccessToken =
            await SessionStorage.getItem(ACCESS_TOKEN_KEY);

        const currentRefreshToken =
            await SessionStorage.getItem(REFRESH_TOKEN_KEY);

        if (!currentAccessToken || !currentRefreshToken) {
            await clearSession();
            return null;
        }

        await SessionStorage.setItem(
            USER_KEY,
            JSON.stringify(user),
        );

        return {
            user,
            accessToken: currentAccessToken,
            refreshToken: currentRefreshToken,
        };
    } catch (error: unknown) {
        const code =
            typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                typeof error.code === 'string'
                ? error.code
                : undefined;

        const definitiveSessionErrors = [
            'INVALID_REFRESH_TOKEN',
            'REFRESH_TOKEN_REVOKED',
            'REFRESH_TOKEN_EXPIRED',
            'USER_INACTIVE',
            'USER_NOT_FOUND',
        ];

        if (
            code &&
            definitiveSessionErrors.includes(code)
        ) {
            await clearSession();
            return null;
        }

        // Si el access token es inválido, intentamos renovar
        // la sesión con el refresh token que ya tenemos guardado.
        if (code === 'INVALID_TOKEN') {
            const storedRefreshToken =
                await SessionStorage.getItem(REFRESH_TOKEN_KEY);

            if (!storedRefreshToken) {
                await clearSession();
                return null;
            }

            try {
                const refreshed = await api.refresh(storedRefreshToken);
                return await saveSession(refreshed);
            } catch (refreshError: unknown) {
                const refreshCode =
                    typeof refreshError === 'object' &&
                        refreshError !== null &&
                        'code' in refreshError &&
                        typeof refreshError.code === 'string'
                        ? refreshError.code
                        : undefined;

                if (
                    refreshCode &&
                    definitiveSessionErrors.includes(refreshCode)
                ) {
                    await clearSession();
                    return null;
                }

                // Si falla por conexión o por un error temporal,
                // conservamos las credenciales para reintentar.
                throw refreshError;
            }
        }

        // Un error de conexión o del servidor no demuestra
        // que la sesión haya sido revocada.
        // Conservamos las credenciales y propagamos el error.
        throw error;
    }
}

async function logout() {
    const refreshToken =
        await SessionStorage.getItem(REFRESH_TOKEN_KEY);

    try {
        if (refreshToken) {
            await api.logout(refreshToken);
        }
    } catch {
        // Aunque el servidor falle, limpiamos la sesión local.
    } finally {
        await clearSession();
    }
}

async function getStoredUser(): Promise<User | null> {
    const storedUser = await SessionStorage.getItem(USER_KEY);
    if (!storedUser) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(storedUser);
        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('id' in parsed) ||
            (typeof parsed.id !== 'string' && typeof parsed.id !== 'number') ||
            !String(parsed.id).trim() ||
            !('name' in parsed) || typeof parsed.name !== 'string' ||
            !('email' in parsed) || typeof parsed.email !== 'string'
        ) {
            await SessionStorage.deleteItem(USER_KEY);
            return null;
        }

        return {
            id: String(parsed.id),
            name: parsed.name,
            email: parsed.email,
            ...('role' in parsed ? { role: parsed.role as User['role'] } : {}),
        };
    } catch {
        // Elimina datos corruptos para no reutilizarlos en una sesión posterior.
        await SessionStorage.deleteItem(USER_KEY);
        return null;
    }
}

async function getAccessToken(): Promise<string | null> {
    return SessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export const AuthService = {
    login,
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    resendVerification,
    restoreSession,
    logout,
    getStoredUser,
    getAccessToken,
};