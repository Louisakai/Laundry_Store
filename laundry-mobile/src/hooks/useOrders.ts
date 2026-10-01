import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import type {
  Order,
  CreateOrderPayload,
  Payment,
  CreateReviewPayload,
  Review,
} from '@/types';

export function useOrders() {
  return useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data;
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateOrderPayload) => {
      const res = await api.post('/orders', data);
      return res.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.patch(`/orders/${id}/cancel`, { reason });
      return res.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
      lat,
      lng,
    }: {
      id: string;
      status: string;
      note?: string;
      lat?: number;
      lng?: number;
    }) => {
      const res = await api.patch(`/orders/${id}/status`, { status, note, lat, lng });
      return res.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
}

export function useWeighOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: string;
      items: { orderItemId: string; quantity: number }[];
    }) => {
      const res = await api.patch(`/orders/${id}/weigh`, { items });
      return res.data as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
}

export function useCompleteDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      amountReceived,
      provider,
    }: {
      id: string;
      amountReceived?: number;
      provider?: string;
    }) => {
      const res = await api.post(`/orders/${id}/complete-delivery`, {
        amountReceived,
        provider,
      });
      return res.data as Order | Payment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
}

export function useConfirmPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/orders/${id}/confirm-payment`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
      qc.invalidateQueries({ queryKey: ['order'] });
    },
  });
}

export function useOrderReview(orderId: string | undefined) {
  return useQuery<Review>({
    queryKey: ['review', orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${orderId}/review`);
      return res.data;
    },
    enabled: !!orderId,
    retry: false,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: string; payload: CreateReviewPayload }) => {
      const res = await api.post(`/orders/${orderId}/review`, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review'] });
    },
  });
}
