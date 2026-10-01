import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PICKING_UP: 'Đang lấy đồ',
  RECEIVED: 'Đã nhận đồ',
  PROCESSING: 'Đang giặt',
  COMPLETED: 'Hoàn thành',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export const orderTypeLabels: Record<string, string> = {
  ONLINE: 'Lấy tận nơi - Giao tận nhà',
  WALKIN: 'Mang đến tiệm - Tự đến lấy',
  DROP_OFF: 'Mang đến tiệm - Giao tận nhà',
};

export const statusBadgeVariant: Record<string, string> = {
  PENDING: 'pending',
  CONFIRMED: 'pending',
  PICKING_UP: 'processing',
  RECEIVED: 'processing',
  PROCESSING: 'processing',
  COMPLETED: 'delivered',
  DELIVERING: 'processing',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};
