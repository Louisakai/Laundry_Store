import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { API_URL } from '@/constants/config';

export function useSocket(orderId?: string): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;

    let disposed = false;
    const s = io(`${API_URL}/orders`, {
      auth: { token },
      transports: ['websocket'],
    });

    s.on('connect', () => {
      if (disposed) return;
      if (orderId) {
        s.emit('join-order', orderId);
      }
      setSocket(s);
    });
    s.on('disconnect', () => {
      setSocket((cur) => (cur === s ? null : cur));
    });

    return () => {
      disposed = true;
      if (orderId) {
        s.emit('leave-order', orderId);
      }
      s.disconnect();
      setSocket((cur) => (cur === s ? null : cur));
    };
  }, [token, orderId]);

  return socket;
}

export function useOrderSocket(
  orderId: string | undefined,
  onStatusChanged?: (payload?: { status?: string }) => void,
): Socket | null {
  const socket = useSocket(orderId);

  useEffect(() => {
    if (!socket || !onStatusChanged) return;
    const handler = (payload?: { status?: string }) => onStatusChanged(payload);
    const onReconnect = () => onStatusChanged();
    socket.on('order-status-changed', handler);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('order-status-changed', handler);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, onStatusChanged]);

  return socket;
}
