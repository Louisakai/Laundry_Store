'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Review {
  id: string;
  order_id: string;
  serviceRating: number;
  serviceComment?: string | null;
  shipperRating?: number | null;
  shipperComment?: string | null;
  created_at: string;
  customer?: { fullName: string };
}

export function useStaffReviews(staffId: string) {
  return useQuery<Review[]>({
    queryKey: ['staff-reviews', staffId],
    queryFn: async () => {
      const res = await api.get(`/reviews/staff/${staffId}`);
      return res.data;
    },
    enabled: !!staffId,
  });
}

export function useOrderReview(orderId: string) {
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

export function useCreateReview(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      serviceRating: number;
      serviceComment?: string;
      shipperRating?: number;
      shipperComment?: string;
    }) => {
      const res = await api.post(`/orders/${orderId}/review`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review', orderId] });
      qc.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
}
