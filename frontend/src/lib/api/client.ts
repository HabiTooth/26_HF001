import axios from 'axios';
import { readToken, clearStoredAuth } from '@/lib/tokenStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  // 빼면 ngrok 경고 HTML 응답
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

apiClient.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 자동 로그아웃. 로그인 요청은 제외
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      const url: string = error.config?.url ?? '';
      if (readToken() && !url.startsWith('/api/auth')) {
        clearStoredAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
