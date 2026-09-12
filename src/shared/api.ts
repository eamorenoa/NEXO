// Para otro entorno, cambia esta URL o inyecta EXPO_PUBLIC_API_URL desde la configuración de Expo.
const API_URL = 'http://localhost:3000/api';
export type ApiUser = { id: string | number; name: string; email: string; role?: string };
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'No se pudo completar la solicitud');
  return body as T;
}
export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  login: (email: string, password: string) => request<{ token: string; user: ApiUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => request<{ token: string; user: ApiUser }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  needs: (token: string) => request<any[]>('/needs', { headers: { Authorization: `Bearer ${token}` } }),
  createNeed: (token: string, description: string, category: string) => request<any>('/needs', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ description, category }) }),
  community: (token: string) => request<any[]>('/community', { headers: { Authorization: `Bearer ${token}` } }),
  createPost: (token: string, body: string) => request<any>('/community', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ body }) }),
  stats: (token: string) => request<any>('/stats', { headers: { Authorization: `Bearer ${token}` } }),
};
