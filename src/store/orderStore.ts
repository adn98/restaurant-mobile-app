import { create } from "zustand";
import { Order, Invoice, MenuItem, PaymentMethod, OrderItem } from "@/types";
import { apiFetch } from "@/utils/api";

interface OrderStore {
  orders: Order[];
  invoices: Invoice[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
  fetchInvoices: () => Promise<void>;
  createOrder: (tableId: number, guests: number) => Promise<Order>;
  updateOrderItem: (orderId: string, menuItem: MenuItem, qty: number) => Promise<void>;
  generateBill: (orderId: string) => Promise<void>;
  closeOrder: (orderId: string, method: PaymentMethod) => Promise<Invoice>;
}

export const useOrderStore = create<OrderStore>()((set, get) => ({
  orders: [],
  invoices: [],
  loading: false,
  fetchOrders: async () => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/orders");
      set({ orders: data, loading: false });
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      set({ loading: false });
    }
  },
  fetchInvoices: async () => {
    try {
      const data = await apiFetch("/api/invoices");
      set({ invoices: data });
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  },
  createOrder: async (tableId, guests) => {
    try {
      const order = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ tableId, guests }),
      });
      set((state) => ({ orders: [...state.orders, order] }));
      return order;
    } catch (error) {
      console.error("Failed to create order:", error);
      throw error;
    }
  },
  updateOrderItem: async (orderId, menuItem, qty) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (!order) return;

    // Build the updated order items list to sync
    const withoutItem = order.items.filter((item) => item.menuItemId !== menuItem.id);
    const updatedItems =
      qty > 0
        ? [
            ...withoutItem,
            {
              menuItemId: menuItem.id,
              name: menuItem.name,
              price: Number(menuItem.price),
              qty,
            },
          ]
        : withoutItem;

    try {
      const updatedOrder = await apiFetch(`/api/orders/${orderId}/items`, {
        method: "PUT",
        body: JSON.stringify({ items: updatedItems }),
      });

      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
      }));
    } catch (error) {
      console.error(`Failed to update order item for order ${orderId}:`, error);
    }
  },
  generateBill: async (orderId) => {
    try {
      const updatedOrder = await apiFetch(`/api/orders/${orderId}/bill`, {
        method: "POST",
      });
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
      }));
    } catch (error) {
      console.error(`Failed to generate bill for order ${orderId}:`, error);
    }
  },
  closeOrder: async (orderId, method) => {
    try {
      const invoice = await apiFetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod: method }),
      });

      set((state) => ({
        invoices: [...state.invoices, invoice],
        orders: state.orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                status: "paid",
                paymentMethod: method,
                closedAt: invoice.createdAt,
              }
            : o
        ),
      }));

      return invoice;
    } catch (error) {
      console.error(`Failed to close order ${orderId}:`, error);
      throw error;
    }
  },
}));
