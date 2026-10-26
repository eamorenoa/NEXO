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

    await SessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    await SessionStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    await SessionStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
        user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
    };
}

async function clearSession() {
    await SessionStorage.deleteItem(ACCESS_TOKEN_KEY);
    await SessionStorage.deleteItem(REFRESH_TOKEN_KEY);
    await SessionStorage.deleteItem(USER_KEY);
}

async function login(
    email: string,
    password: string,
): Promise<Session> {
    const response = await api.login(email, password);
    return saveSession(response);
}

async function register(
    name: string,
    email: string,
    password: string,
) {
    return api.register(name, email, password);
}

async function verifyEmail(
    email: string,
    code: string,
) {
    return api.verifyEmail(email, code);
}

async function forgotPassword(email: string) {
    return api.forgotPassword(email);
}

async function resetPassword(
    email: string,
    code: string,
    newPassword: string,
) {
    return api.resetPassword(
        email,
        code,
        newPassword,
    );
}

async function resendVerification(email: string) {
    return api.resendVerification(email);
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
    const storedUser =
        await SessionStorage.getItem(USER_KEY);

    if (!storedUser) {
        return null;
    }

    try {
        return JSON.parse(storedUser) as User;
    } catch {
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