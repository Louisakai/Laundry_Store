'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Service } from '@/types';

export function useServices() {
  return useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/services');
      return res.data;
    },
  });
}

export function useService(id: string) {
  return useQuery<Service>({
    queryKey: ['service', id],
    queryFn: async () => {
      const res = await api.get(`/services/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
