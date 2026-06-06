import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach JWT to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Read token directly from localStorage to avoid stale closure
  try {
    const raw = localStorage.getItem('hrms-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch { /* ignore parse errors */ }
  return config;
});

// Handle token expiry — attempt silent refresh, only logout on refresh failure
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only handle 401 and only once per request
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const raw = localStorage.getItem('hrms-auth');
        const refreshToken = raw ? JSON.parse(raw)?.state?.refreshToken : null;

        if (!refreshToken) {
          // No refresh token — logout silently
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to get a new access token
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);

        // Retry the original request with new token
        if (original.headers) {
          original.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return api(original);
      } catch {
        // Refresh also failed — now logout
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // For all other errors (403, 404, 500, etc.) — do NOT logout
    return Promise.reject(error);
  }
);

export default api;
