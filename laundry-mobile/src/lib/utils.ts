export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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

export const paymentProviderLabels: Record<string, string> = {
  CASH: 'Tiền mặt',
  PAYOS: 'PayOS (QR)',
};

export const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Chưa thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const ORDER_STATUS_ORDER = [
  'PENDING',
  'CONFIRMED',
  'PICKING_UP',
  'RECEIVED',
  'PROCESSING',
  'COMPLETED',
  'DELIVERING',
  'DELIVERED',
];

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(s));
}
