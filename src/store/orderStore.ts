import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_ORDERS } from "@/constants/mockData";
import { calculateOrder } from "@/utils/calculations";
import { Invoice, MenuItem, Order, OrderItem, PaymentMethod } from "@/types";

interface OrderStore {
  orders: Order[];
  invoices: Invoice[];
  createOrder: (tableId: number, guests: number) => Order;
  updateOrderItem: (orderId: string, menuItem: MenuItem, qty: number) => void;
  generateBill: (orderId: string) => void;
  closeOrder: (orderId: string, method: PaymentMethod) => Invoice;
}

function nextOrderNumber(count: number) {
  return `#${1026 + count}`;
}

function recalculate(order: Order, items: OrderItem[]) {
  return {
    ...order,
    items,
    ...calculateOrder(items),
  };
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: DEFAULT_ORDERS,
      invoices: [],
      createOrder: (tableId, guests) => {
        const order: Order = {
          id: `ord_${Date.now()}`,
          tableId,
          orderNo: nextOrderNumber(get().orders.length),
          guests,
          status: "open",
          items: [],
          subtotal: 0,
          gstAmount: 0,
          total: 0,
          openedAt: new Date().toISOString(),
        };
        set((state) => ({ orders: [...state.orders, order] }));
        return order;
      },
      updateOrderItem: (orderId, menuItem, qty) =>
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) {
              return order;
            }

            const withoutItem = order.items.filter((item) => item.menuItemId !== menuItem.id);
            const items =
              qty > 0
                ? [
                    ...withoutItem,
                    {
                      menuItemId: menuItem.id,
                      name: menuItem.name,
                      price: menuItem.price,
                      qty,
                    },
                  ]
                : withoutItem;

            return recalculate(order, items);
          }),
        })),
      generateBill: (orderId) =>
        set((state) => ({
          orders: state.orders.map((order) => (order.id === orderId ? { ...order, status: "billed" } : order)),
        })),
      closeOrder: (orderId, method) => {
        const order = get().orders.find((item) => item.id === orderId);
        if (!order) {
          throw new Error("Order not found");
        }

        const invoice: Invoice = {
          id: `inv_${Date.now()}`,
          orderId: order.id,
          tableId: order.tableId,
          orderNo: order.orderNo,
          items: order.items,
          subtotal: order.subtotal,
          gstAmount: order.gstAmount,
          total: order.total,
          paymentMethod: method,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          invoices: [...state.invoices, invoice],
          orders: state.orders.map((item) =>
            item.id === orderId
              ? {
                  ...item,
                  status: "paid",
                  paymentMethod: method,
                  closedAt: invoice.createdAt,
                }
              : item,
          ),
        }));
        return invoice;
      },
    }),
    {
      name: "pos-orders",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
