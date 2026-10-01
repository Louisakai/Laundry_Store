'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { RouteResult, NearestShipper } from '@/types';

export function useOptimizeRoute() {
  return useMutation({
    mutationFn: async (shipperId: string) => {
      const res = await api.post('/route/optimize', { shipperId });
      return res.data as RouteResult;
    },
  });
}

export function useNavigateOrder() {
  return useMutation({
    mutationFn: async ({
      shipperId,
      orderId,
      direction,
      currentLat,
      currentLng,
    }: {
      shipperId: string;
      orderId: string;
      direction: 'pickup' | 'delivery' | 'store';
      currentLat?: number;
      currentLng?: number;
    }) => {
      const res = await api.post('/route/navigate', { shipperId, orderId, direction, currentLat, currentLng });
      return res.data;
    },
  });
}

export function useNearestShipper(addressId: string) {
  return useQuery<NearestShipper[]>({
    queryKey: ['nearest-shipper', addressId],
    queryFn: async () => {
      const res = await api.get(`/route/nearest-shipper?addressId=${addressId}`);
      return res.data;
    },
    enabled: !!addressId,
  });
}
