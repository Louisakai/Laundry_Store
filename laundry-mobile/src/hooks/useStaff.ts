import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { OrderStatus } from '@/types';
import type { Order, RouteResult, NavigateResult } from '@/types';

export function useMyOrders() {
  return useQuery<Order[]>({
    queryKey: ['staff-orders'],
    queryFn: async () => {
      const res = await api.get('/staff/orders');
      return (res.data as Order[]).filter(
        (o) =>
          o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED,
      );
    },
  });
}

export function useMyAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/staff/availability');
      return res.data as { id: string; isAvailable: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useUpdateLocation() {
  return useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const res = await api.patch('/staff/location', { lat, lng });
      return res.data;
    },
  });
}

export function useSetLocationToStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/staff/location/store');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useOptimizeRoute() {
  return useMutation({
    mutationFn: async (shipperId: string) => {
      const res = await api.post('/route/optimize', { shipperId });
      return res.data as RouteResult;
    },
  });
}

export function useNavigate() {
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
      const res = await api.post('/route/navigate', {
        shipperId,
        orderId,
        direction,
        currentLat,
        currentLng,
      });
      return res.data as NavigateResult;
    },
  });
}

export function useStaffReviews(staffId: string | undefined) {
  return useQuery({
    queryKey: ['staff-reviews', staffId],
    queryFn: async () => {
      const res = await api.get(`/reviews/staff/${staffId}`);
      return res.data;
    },
    enabled: !!staffId,
  });
}
