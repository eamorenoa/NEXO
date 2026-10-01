import * as SecureStore from 'expo-secure-store';
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
    await SecureStore.setItemAsync(
        ACCESS_TOKEN_KEY,
        response.accessToken,
    );

    await SecureStore.setItemAsync(
        REFRESH_TOKEN_KEY,
        response.refreshToken,
    );

    await SecureStore.setItemAsync(
        USER_KEY,
        JSON.stringify(response.user),
    );

    return {
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
    };
}

async function clearSession() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
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
        await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

    const refreshToken =
        await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    const storedUser =
        await SecureStore.getItemAsync(USER_KEY);

    if (!accessToken || !refreshToken) {
        return null;
    }

    try {
        const response = await api.me(accessToken);

        const user = response.user;

        await SecureStore.setItemAsync(
            USER_KEY,
            JSON.stringify(user),
        );

        return {
            user,
            accessToken,
            refreshToken,
        };
    } catch {
        try {
            const refreshed = await api.refresh(refreshToken);

            return saveSession(refreshed);
        } catch {
            await clearSession();
            return null;
        }
    }
}

async function logout() {
    const refreshToken =
        await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

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
        await SecureStore.getItemAsync(USER_KEY);

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
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
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