import { CartItem, ConfirmedOrder, MenuItem, OrderStatus, TimeSlot, UserInfo } from './types';

interface TimeSlotsResponse {
  date: string;
  slots: TimeSlot[];
}

interface OrderPayload {
  customer: UserInfo;
  pickupTime: string;
  items: Pick<CartItem, 'id' | 'quantity'>[];
}

const API_BASE = '/api';

export async function getMenu(): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>('/menu');
}

export async function getTimeSlots(): Promise<TimeSlotsResponse> {
  return apiFetch<TimeSlotsResponse>('/time-slots');
}

export async function createOrder(payload: OrderPayload): Promise<ConfirmedOrder> {
  return apiFetch<ConfirmedOrder>('/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function getAdminOrders(password: string): Promise<ConfirmedOrder[]> {
  return apiFetch<ConfirmedOrder[]>('/admin/orders', {
    headers: adminHeaders(password),
  });
}

export async function updateAdminOrderStatus(
  orderNumber: string,
  status: OrderStatus,
  password: string,
): Promise<ConfirmedOrder> {
  return apiFetch<ConfirmedOrder>(`/admin/orders/${orderNumber}/status`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(password),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
}

export async function getAdminMenu(password: string): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>('/admin/menu', {
    headers: adminHeaders(password),
  });
}

export async function createAdminMenuItem(item: Omit<MenuItem, 'id'>, password: string): Promise<MenuItem> {
  return apiFetch<MenuItem>('/admin/menu', {
    method: 'POST',
    headers: {
      ...adminHeaders(password),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
}

export async function updateAdminMenuItem(item: MenuItem, password: string): Promise<MenuItem> {
  return apiFetch<MenuItem>(`/admin/menu/${item.id}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(password),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
}

export async function deleteAdminMenuItem(id: string, password: string): Promise<void> {
  await apiFetch<void>(`/admin/menu/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(password),
  });
}

export async function getAdminTimeSlots(password: string): Promise<string[]> {
  return apiFetch<string[]>('/admin/time-slots', {
    headers: adminHeaders(password),
  });
}

export async function createAdminTimeSlot(time: string, password: string): Promise<string[]> {
  return apiFetch<string[]>('/admin/time-slots', {
    method: 'POST',
    headers: {
      ...adminHeaders(password),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ time }),
  });
}

export async function deleteAdminTimeSlot(time: string, password: string): Promise<string[]> {
  return apiFetch<string[]>(`/admin/time-slots/${encodeURIComponent(time)}`, {
    method: 'DELETE',
    headers: adminHeaders(password),
  });
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Não foi possível falar com o servidor.');
  }

  return data as T;
}

function adminHeaders(password: string) {
  return {
    'x-admin-password': password,
  };
}
