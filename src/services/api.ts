import { API_URL } from '../config/env';
import { User } from '../models/User';
import { Need } from '../models/Need';
import { CommunityPost } from '../models/CommunityPost';
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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      body.message || 'No se pudo completar la solicitud',
    ) as Error & {
      status?: number;
      code?: string;
      requiresVerification?: boolean;
      email?: string;
    };

    error.status = response.status;
    error.code = body.code;
    error.requiresVerification = body.requiresVerification;
    error.email = body.email;

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
  ) =>
    request<Need>('/needs', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        description,
        category,
      }),
    }),

  updateNeed: (
    token: string,
    id: number | string,
    description: string,
  ) =>
    request<Need>(`/needs/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ description }),
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

  createPost: (token: string, body: string) =>
    request<CommunityPost>('/community', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body }),
    }),

  places: () =>
    request<MapPlace[]>('/map/places'),

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
