import { API_URL } from '../config/env';
import { User } from '../models/User';
import { Need } from '../models/Need';
import { CommunityPost } from '../models/CommunityPost';
import { MapPlace } from '../models/MapPlace';
import { AIResponse } from '../models/AIResponse';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'No se pudo completar la solicitud');
  return body as T;
}

export const api = {
  login: (email: string, password: string) => request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  needs: (token: string) => request<Need[]>('/needs', { headers: { Authorization: `Bearer ${token}` } }),
  createNeed: (token: string, description: string, category?: string) => request<Need>('/needs', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ description, category }) }),
  community: (token: string) => request<CommunityPost[]>('/community', { headers: { Authorization: `Bearer ${token}` } }),
  createPost: (token: string, body: string) => request<CommunityPost>('/community', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ body }) }),
  places: () => request<MapPlace[]>('/map/places'),
  ai: (token: string, message: string, latitude?: number, longitude?: number) => request<AIResponse>('/ai/assistant', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ message, latitude, longitude }) }),
  stats: (token: string) => request<any>('/stats', { headers: { Authorization: `Bearer ${token}` } }),
};
