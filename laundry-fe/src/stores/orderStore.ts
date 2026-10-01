import { create } from 'zustand';
import { OrderType } from '@/types';

interface OrderItemInput {
  serviceId: string;
  name: string;
  quantity: number;
  price: number;
  unit: string;
}

interface OrderWizardState {
  step: number;
  orderType: OrderType | null;
  items: OrderItemInput[];
  pickupAddressId: string | null;
  deliveryAddressId: string | null;
  pickupWindowStart: string | null;
  pickupWindowEnd: string | null;
  deliveryWindowStart: string | null;
  deliveryWindowEnd: string | null;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  notes: string;

  setStep: (step: number) => void;
  setOrderType: (type: OrderType) => void;
  setItems: (items: OrderItemInput[]) => void;
  addItem: (item: OrderItemInput) => void;
  removeItem: (serviceId: string) => void;
  updateItemQuantity: (serviceId: string, quantity: number) => void;
  setPickupAddressId: (id: string | null) => void;
  setDeliveryAddressId: (id: string | null) => void;
  setPickupWindow: (start: string | null, end: string | null) => void;
  setDeliveryWindow: (start: string | null, end: string | null) => void;
  setContact: (field: string, value: string) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const initialState = {
  step: 1,
  orderType: null as OrderType | null,
  items: [] as OrderItemInput[],
  pickupAddressId: null as string | null,
  deliveryAddressId: null as string | null,
  pickupWindowStart: null as string | null,
  pickupWindowEnd: null as string | null,
  deliveryWindowStart: null as string | null,
  deliveryWindowEnd: null as string | null,
  pickupContactName: '',
  pickupContactPhone: '',
  deliveryContactName: '',
  deliveryContactPhone: '',
  notes: '',
};

export const useOrderStore = create<OrderWizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setOrderType: (orderType) => set({
    orderType, step: 2,
    pickupAddressId: null,
    deliveryAddressId: null,
    pickupWindowStart: null,
    pickupWindowEnd: null,
    deliveryWindowStart: null,
    deliveryWindowEnd: null,
    pickupContactName: '',
    pickupContactPhone: '',
    deliveryContactName: '',
    deliveryContactPhone: '',
  }),
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (serviceId) =>
    set((s) => ({ items: s.items.filter((i) => i.serviceId !== serviceId) })),
  updateItemQuantity: (serviceId, quantity) =>
    set((s) => ({
      items: s.items.map((i) => (i.serviceId === serviceId ? { ...i, quantity } : i)),
    })),
  setPickupAddressId: (id) => set({ pickupAddressId: id }),
  setDeliveryAddressId: (id) => set({ deliveryAddressId: id }),
  setPickupWindow: (start, end) => set({ pickupWindowStart: start, pickupWindowEnd: end }),
  setDeliveryWindow: (start, end) => set({ deliveryWindowStart: start, deliveryWindowEnd: end }),
  setContact: (field, value) => set((s) => ({ ...s, [field]: value })),
  setNotes: (notes) => set({ notes }),
  reset: () => set(initialState),
}));
