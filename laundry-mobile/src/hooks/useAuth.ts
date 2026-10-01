import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api, { getApiErrorMessage } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import type { AuthResponse, User } from '@/types';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const res = await api.post<AuthResponse>('/auth/login', payload);
      return res.data;
    },
    onSuccess: async (data) => {
      await login(data.accessToken, data.refreshToken, data.user);
    },
  });
}

export function useRegister() {
  const login = useAuthStore((s) => s.login);
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const res = await api.post<AuthResponse>('/auth/register', payload);
      return res.data;
    },
    onSuccess: async (data) => {
      await login(data.accessToken, data.refreshToken, data.user);
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: async () => {
      await logout();
    },
  });
}

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<User>('/auth/me');
      await setUser(res.data);
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => {
      const res = await api.patch('/auth/change-password', { oldPassword, newPassword });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export { getApiErrorMessage };
