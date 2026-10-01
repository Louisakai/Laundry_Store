import axios, {
  create as axiosCreate,
  isAxiosError,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { API_URL } from '@/constants/config';

const api = axiosCreate({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = res.data;
          await useAuthStore.getState().setTokens(accessToken, refreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          await useAuthStore.getState().logout();
        }
      } else {
        await useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;
    if (Array.isArray(data?.message)) return data!.message![0];
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (!err.response) return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default api;
