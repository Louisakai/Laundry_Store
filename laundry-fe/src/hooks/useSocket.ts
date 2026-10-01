'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useSocket(orderId?: string, staffId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${SOCKET_URL}/orders`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      if (orderId) {
        socket.emit('join-order', orderId);
      }
    });

    socketRef.current = socket;

    return () => {
      if (orderId) {
        socket.emit('leave-order', orderId);
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, orderId, staffId]);

  return socketRef;
}
