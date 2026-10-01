import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

let nextId = 0;

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, type?: ToastItem['type']) => void;
  remove: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
