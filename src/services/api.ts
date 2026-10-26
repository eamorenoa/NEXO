import { API_URL } from '../config/env';
import { SessionStorage } from './SessionStorage';
import { User } from '../models/User';
import { Need } from '../models/Need';
import { CommunityPost, CreateCommunityPostInput } from '../models/CommunityPost';
import { MapPlace } from '../models/MapPlace';
import { AIResponse } from '../models/AIResponse';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RegisterResponse {
  message: string;
  verificationRequired: boolean;
  emailSent: boolean;
  user: User;
}

export interface VerifyEmailResponse {
  ok: boolean;
  message: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface ForgotPasswordResponse {
  ok: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  ok: boolean;
  message: string;
}

type ApiError = Error & {
  status?: number;
  code?: string;
  requiresVerification?: boolean;
  email?: string;
};

const ACCESS_TOKEN_KEY = 'nexo_access_token';
const REFRESH_TOKEN_KEY = 'nexo_refresh_token';
const USER_KEY = 'nexo_user';

let accessTokenRefreshHandler:
  ((accessToken: string | null) => void) | undefined;

export function setAccessTokenRefreshHandler(
  handler: (accessToken: string | null) => void,
): () => void {
  accessTokenRefreshHandler = handler;

  return () => {
    if (accessTokenRefreshHandler === handler) {
      accessTokenRefreshHandler = undefined;
    }
  };
}

let refreshInProgress: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInProgress) {
    return refreshInProgress;
  }

  refreshInProgress = (async () => {
    const refreshToken = await SessionStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      accessTokenRefreshHandler?.(null);
      return null;
    }

    let response: Response;

    try {
      response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Un fallo de red no significa que la sesión haya sido revocada.
      throw new Error('No hay conexión para renovar la sesión. Inténtelo de nuevo.');
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const definitiveSessionErrors = [
        'INVALID_REFRESH_TOKEN',
        'REFRESH_TOKEN_REVOKED',
        'REFRESH_TOKEN_EXPIRED',
        'USER_INACTIVE',
        'USER_NOT_FOUND',
      ];

      if (definitiveSessionErrors.includes(result.code)) {
        await Promise.all([
          SessionStorage.deleteItem(ACCESS_TOKEN_KEY),
          SessionStorage.deleteItem(REFRESH_TOKEN_KEY),
          SessionStorage.deleteItem(USER_KEY),
        ]);
        accessTokenRefreshHandler?.(null);
      }

      const error = new Error(
        result.message || 'No fue posible renovar la sesión.',
      ) as ApiError;

      error.status = response.status;
      error.code =
        typeof result.code === 'string'
          ? result.code
          : undefined;

      throw error;
    }

    if (
      typeof result.accessToken !== 'string' ||
      !result.accessToken ||
      typeof result.refreshToken !== 'string' ||
      !result.refreshToken
    ) {
      // No borramos tokens si la respuesta del servidor está incompleta.
      throw new Error('La respuesta de renovación no contiene tokens válidos.');
    }

    // El backend rota ambos tokens: guardar ambos antes de reintentar.
    await SessionStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    await SessionStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);

    accessTokenRefreshHandler?.(result.accessToken);
    return result.accessToken;
  })();

  try {
    return await refreshInProgress;
  } finally {
    refreshInProgress = null;
  }
}


async function request<T>(
  path: string,
  options: RequestInit = {},
  hasRetried = false,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      body.message || 'No se pudo completar la solicitud',
    ) as ApiError;

    error.status = response.status;
    error.code = body.code;
    error.requiresVerification = body.requiresVerification;
    error.email = body.email;

    if (
      response.status === 401 &&
      body.code === 'TOKEN_EXPIRED' &&
      !hasRetried &&
      path !== '/auth/refresh'
    ) {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        const retryHeaders = new Headers(options.headers);
        retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);

        return request<T>(
          path,
          { ...options, headers: retryHeaders },
          true,
        );
      }
    }

    throw error;
  }

  return body as T;
}

export const api = {
  login: (
    email: string,
    password: string,
  ) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (
    name: string,
    email: string,
    password: string,
  ) =>
    request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  verifyEmail: (
    email: string,
    code: string,
  ) =>
    request<VerifyEmailResponse>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  forgotPassword: (email: string) =>
    request<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) =>
    request<ResetPasswordResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code,
        newPassword,
      }),
    }),

  resendVerification: (email: string) =>
    request<VerifyEmailResponse>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  refresh: (refreshToken: string) =>
    request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string) =>
    request<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: (accessToken: string) =>
    request<{
      user: User;
      permissions?: string[];
    }>('/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),

  needs: (token: string) =>
    request<Need[]>('/needs', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  createNeed: (
    token: string,
    description: string,
    category?: string,
    location?: {
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) =>
    request<Need>('/needs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        description,
        category,
        ...location,
      }),
    }),

  updateNeed: (
    token: string,
    id: number | string,
    description: string,
    location?: {
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
  ) =>
    request<Need>(`/needs/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        description,
        ...location,
      }),
    }),
  deleteNeed: (
    token: string,
    id: number | string,
  ) =>
    request<{ ok: boolean; message: string }>(`/needs/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  community: (token: string) =>
    request<CommunityPost[]>('/community', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  createPost: (
    token: string,
    input: string | CreateCommunityPostInput,
  ) => {
    const payload = typeof input === 'string'
      ? { body: input }
      : input;

    return request<CommunityPost>('/community', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  },

  updatePost: (
    token: string,
    id: number | string,
    input: CreateCommunityPostInput,
  ) =>
    request<CommunityPost>(`/community/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    }),

  deletePost: (
    token: string,
    id: number | string,
  ) =>
    request<{ ok: boolean; message: string }>(`/community/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),

  places: async () => {
    const token = await SessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!token) {
      throw new Error('No hay una sesión activa para consultar el mapa.');
    }

    return request<MapPlace[]>('/map/places', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  ai: (
    token: string,
    message: string,
    latitude?: number,
    longitude?: number,
  ) =>
    request<AIResponse>('/ai/assistant', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        latitude,
        longitude,
      }),
    }),

  stats: (token: string) =>
    request<any>('/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
};
