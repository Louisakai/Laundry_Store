'use client';

import { useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { StaffInfo, Order } from '@/types';

export function useStaffList(params?: {
  staffType?: string;
  isAvailable?: boolean;
  workZone?: string;
  refetchInterval?: number;
}) {
  const { refetchInterval, ...filterParams } = params ?? {};
  const searchParams = new URLSearchParams();
  if (filterParams.staffType) searchParams.set('staffType', filterParams.staffType);
  if (filterParams.isAvailable !== undefined) searchParams.set('isAvailable', String(filterParams.isAvailable));
  if (filterParams.workZone) searchParams.set('workZone', filterParams.workZone);

  const qs = searchParams.toString();
  return useQuery<StaffInfo[]>({
    queryKey: ['staff', filterParams],
    queryFn: async () => {
      const res = await api.get(`/staff${qs ? `?${qs}` : ''}`);
      return res.data;
    },
    refetchInterval,
  });
}

export function useStaff(id: string) {
  return useQuery<StaffInfo & { ordersAsStaff: Order[] }>({
    queryKey: ['staff', id],
    queryFn: async () => {
      const res = await api.get(`/staff/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      fullName: string;
      phone: string;
      staffType: string;
      workZone?: string;
    }) => {
      const res = await api.post('/staff', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { staffType?: string; workZone?: string; isAvailable?: boolean; password?: string };
    }) => {
      const res = await api.patch(`/staff/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/staff/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useMyStaffOrders() {
  return useQuery<Order[]>({
    queryKey: ['staff-orders'],
    queryFn: async () => {
      const res = await api.get('/staff/orders');
      return res.data;
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

export function useToggleAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/staff/availability');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-orders'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSetLocationToStore() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.patch('/staff/location/store');
      return res.data;
    },
  });
}

export function useLocationTracker(enabled: boolean) {
  const updateLocation = useUpdateLocation();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) return;

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          if (
            lastSentRef.current &&
            Math.abs(lastSentRef.current.lat - lat) < 0.0001 &&
            Math.abs(lastSentRef.current.lng - lng) < 0.0001
          ) {
            return;
          }
          lastSentRef.current = { lat, lng };
          updateLocation.mutate({ lat, lng });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 3000 },
      );
    };

    sendLocation();
    intervalRef.current = setInterval(sendLocation, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);
}
