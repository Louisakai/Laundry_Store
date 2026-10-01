'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  AdminStats,
  StaffAnalytics,
  ServiceAnalytics,
  ServiceReview,
  PaginatedOrders,
} from '@/types';

export function useAdminOrders(params?: {
  status?: string;
  orderType?: string;
  workZone?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  refetchInterval?: number;
}) {
  const { refetchInterval, ...filterParams } = params ?? {};
  const searchParams = new URLSearchParams();
  if (filterParams.status) searchParams.set('status', filterParams.status);
  if (filterParams.orderType) searchParams.set('orderType', filterParams.orderType);
  if (filterParams.workZone) searchParams.set('workZone', filterParams.workZone);
  if (filterParams.fromDate) searchParams.set('fromDate', filterParams.fromDate);
  if (filterParams.toDate) searchParams.set('toDate', filterParams.toDate);
  if (filterParams.search) searchParams.set('search', filterParams.search);
  if (filterParams.page) searchParams.set('page', String(filterParams.page));
  if (filterParams.limit) searchParams.set('limit', String(filterParams.limit));

  const qs = searchParams.toString();
  return useQuery<PaginatedOrders>({
    queryKey: ['admin-orders', filterParams],
    queryFn: async () => {
      const res = await api.get(`/admin/orders${qs ? `?${qs}` : ''}`);
      return res.data;
    },
    refetchInterval,
  });
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    refetchInterval: 30000,
  });
}

export function useAssignStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      staffId,
    }: {
      orderId: string;
      staffId: string;
    }) => {
      const res = await api.patch(`/orders/${orderId}/assign`, { staffId });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useAdminRevenue(fromDate?: string, toDate?: string) {
  const searchParams = new URLSearchParams();
  if (fromDate) searchParams.set('fromDate', fromDate);
  if (toDate) searchParams.set('toDate', toDate);

  const qs = searchParams.toString();
  return useQuery({
    queryKey: ['admin-revenue', fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/revenue${qs ? `?${qs}` : ''}`);
      return res.data as { totalRevenue: number; orderCount: number; averageOrderValue: number };
    },
  });
}

export function useAdminOrderAnalytics(fromDate?: string, toDate?: string) {
  const searchParams = new URLSearchParams();
  if (fromDate) searchParams.set('fromDate', fromDate);
  if (toDate) searchParams.set('toDate', toDate);

  const qs = searchParams.toString();
  return useQuery({
    queryKey: ['admin-order-analytics', fromDate, toDate],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/orders${qs ? `?${qs}` : ''}`);
      return res.data as {
        byStatus: { status: string; count: number }[];
        byOrderType: { type: string; count: number }[];
        totalOrders: number;
        completedOrders: number;
      };
    },
  });
}

export function useDailyRevenue(params?: { days?: number; fromDate?: string; toDate?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.days) searchParams.set('days', String(params.days));
  if (params?.fromDate) searchParams.set('fromDate', params.fromDate);
  if (params?.toDate) searchParams.set('toDate', params.toDate);
  const qs = searchParams.toString();

  return useQuery({
    queryKey: ['admin-daily-revenue', params],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/daily-revenue${qs ? `?${qs}` : ''}`);
      return res.data as { date: string; revenue: number }[];
    },
  });
}

export function useServiceAnalytics() {
  return useQuery<ServiceAnalytics[]>({
    queryKey: ['admin-service-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/services');
      return res.data;
    },
  });
}

export function useServiceReviews() {
  return useQuery<ServiceReview[]>({
    queryKey: ['admin-service-reviews'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/service-reviews');
      return res.data;
    },
  });
}

export function useStaffAnalytics() {
  return useQuery<StaffAnalytics[]>({
    queryKey: ['admin-staff-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/staff');
      return res.data;
    },
  });
}

export function useAutoAssignShipper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/orders/${orderId}/auto-assign`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      items,
    }: {
      id: string;
      items: { orderItemId: string; quantity: number }[];
    }) => {
      const res = await api.patch(`/admin/orders/${id}/services`, { items });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useUpdateOrderPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, totalPrice }: { id: string; totalPrice: number }) => {
      const res = await api.patch(`/admin/orders/${id}/price`, { totalPrice });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order'] });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; pricePerUnit: number; unit: string; description?: string }) => {
      const res = await api.post('/services', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; pricePerUnit?: number; unit?: string; description?: string; isActive?: boolean } }) => {
      const res = await api.patch(`/services/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/services/${id}`);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}
