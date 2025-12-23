// API client for backend communication
// Centralizes all HTTP requests with authentication handling

// Use environment variable or default to localhost for development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE = `${API_URL}/api`;

// Helper to get auth token from localStorage
function getToken(): string | null {
  return localStorage.getItem('token');
}

// Generic fetch wrapper with auth
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Type definitions
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  isOwner?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// AUTH API
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    fetchApi<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => fetchApi<{ user: User }>('/auth/me'),

  // Check if GitHub OAuth is enabled on server
  getGitHubStatus: () => fetchApi<{ enabled: boolean }>('/auth/github/status'),

  // Get GitHub OAuth URL
  getGitHubAuthUrl: () => `${API_URL}/api/auth/github`,
};

// NOTES API
export const notesApi = {
  list: () => fetchApi<{ notes: Note[] }>('/notes'),

  get: (id: string) => fetchApi<{ note: Note }>(`/notes/${id}`),

  create: (data: { title: string }) =>
    fetchApi<{ note: Note }>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { title?: string; content?: string }) =>
    fetchApi<{ note: Note }>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ message: string }>(`/notes/${id}`, {
      method: 'DELETE',
    }),
};
