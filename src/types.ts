export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  tag?: string;
  available?: boolean;
  stock?: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface UserInfo {
  name: string;
  phone: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface OrderLine {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  quantity: number;
  lineTotal: number;
}

export interface StoreInfo {
  name: string;
  address: string;
  whatsapp: string;
  currency: string;
}

export interface ConfirmedOrder {
  id: string;
  orderNumber: string;
  status: 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  customer: UserInfo;
  pickupDate: string;
  pickupTime: string;
  items: OrderLine[];
  subtotal: number;
  total: number;
  payment: {
    method: 'pickup';
    status: 'pending' | 'paid';
    label: string;
  };
  store: StoreInfo;
  notes: string;
  whatsappUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type CheckoutStep = 'menu' | 'cart' | 'id' | 'time' | 'summary';

export type OrderStatus = ConfirmedOrder['status'];
