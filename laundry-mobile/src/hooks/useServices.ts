import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import type { Service } from '@/types';

export function useServices() {
  return useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/services');
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useActiveServices() {
  const { data } = useServices();
  return (data || []).filter((s) => s.isActive);
}
