export enum Role {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum StaffType {
  WASHER = 'WASHER',
  SHIPPER = 'SHIPPER',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PICKING_UP = 'PICKING_UP',
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum OrderType {
  ONLINE = 'ONLINE',
  WALKIN = 'WALKIN',
  DROP_OFF = 'DROP_OFF',
}

export enum PaymentProvider {
  CASH = 'CASH',
  PAYOS = 'PAYOS',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum NotificationType {
  ORDER_STATUS = 'ORDER_STATUS',
  PAYMENT = 'PAYMENT',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  staffType?: StaffType | null;
  isAvailable?: boolean | null;
  workZone?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  locationUpdatedAt?: string | null;
  createdAt?: string;
}

export interface Address {
  id: string;
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  pricePerUnit: number;
  unit: string;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  serviceId?: string;
  service: Service;
  quantity?: number | null;
  price: number;
  subtotal?: number | null;
}

export interface TrackingLog {
  id: string;
  status: OrderStatus;
  note?: string | null;
  created_at: string;
  changed_by: string;
}

export interface Order {
  id: string;
  customer_id: string;
  staff_id?: string | null;
  customer?: {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
  } | null;
  staff?: {
    id: string;
    fullName: string;
    staffType?: string;
  } | null;
  pickupAddress?: Address | null;
  deliveryAddress?: Address | null;
  status: OrderStatus;
  totalPrice: number;
  orderType: OrderType;
  notes?: string | null;
  pickupWindowStart?: string | null;
  pickupWindowEnd?: string | null;
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  deliveryContactName?: string | null;
  deliveryContactPhone?: string | null;
  cancellationReason?: string | null;
  paymentMethod: PaymentProvider;
  paymentStatus: PaymentStatus;
  orderItems: OrderItem[];
  trackingLogs: TrackingLog[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: PaymentProvider;
  amount: number;
  status: PaymentStatus;
  checkoutUrl?: string | null;
}

export interface CreateOrderPayload {
  orderType: OrderType;
  pickupAddressId?: string;
  deliveryAddressId?: string;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  notes?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  items: { serviceId: string; quantity?: number }[];
}

export interface CreateAddressPayload {
  label: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  type: NotificationType;
  relatedId?: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  serviceRating: number;
  serviceComment?: string | null;
  shipperRating?: number | null;
  shipperComment?: string | null;
  created_at: string;
}

export interface CreateReviewPayload {
  serviceRating: number;
  serviceComment?: string;
  shipperRating?: number;
  shipperComment?: string;
}

export interface RouteStop {
  orderId: string;
  address: Address;
  type: 'pickup' | 'delivery';
  order: number;
}

export interface RouteLeg {
  fromIdx: number;
  toIdx: number;
  path: { lat: number; lng: number }[];
  distance: number;
  source: 'dijkstra';
}

export interface RouteResult {
  stops: RouteStop[];
  totalDistance: number;
  legs?: RouteLeg[];
}

export interface NavigateResult {
  success: boolean;
  data: {
    path: { lat: number; lng: number }[];
    distance: number;
    algorithm: string;
  };
  source: string;
  shipperPosition: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  address: Address;
  order?: { id: string; status: string } | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}
