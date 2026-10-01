'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User } from '@/types';

export function useProfile() {
  return useQuery<User>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });
}
