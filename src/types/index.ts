export type TableStatus = "empty" | "active" | "bill" | "paid";
export type PaymentMethod = "cash" | "upi" | "card" | "credit";
export type OrderStatus = "open" | "hold" | "billed" | "paid";

export interface Table {
  id: number;
  name: string;
  seats: number;
  status: TableStatus;
  currentOrderId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  emoji?: string;
  isAvailable: boolean;
  isVeg: boolean;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: number;
  orderNo: string;
  guests: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  openedAt: string;
  closedAt?: string;
  paymentMethod?: PaymentMethod;
}

export interface Invoice {
  id: string;
  orderId: string;
  tableId: number;
  orderNo: string;
  items: OrderItem[];
  subtotal: number;
  gstAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface AppSettings {
  restaurantName: string;
  address: string;
  gstNumber: string;
  gstPercent: number;
  currency: string;
  tableCount: number;
}
