import { useCallback, useEffect } from "react";
import { useOrderStore } from "@/store/orderStore";
import { useTableStore } from "@/store/tableStore";

export function useTables() {
  const tables = useTableStore((state) => state.tables);
  const fetchTables = useTableStore((state) => state.fetchTables);
  const setTableOrder = useTableStore((state) => state.setTableOrder);
  const setTableStatus = useTableStore((state) => state.setTableStatus);
  const clearTable = useTableStore((state) => state.clearTable);
  const orders = useOrderStore((state) => state.orders);
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const fetchInvoices = useOrderStore((state) => state.fetchInvoices);
  const createOrder = useOrderStore((state) => state.createOrder);

  // Sync tables, orders, and invoices from the REST backend
  useEffect(() => {
    fetchTables();
    fetchOrders();
    fetchInvoices();
  }, [fetchTables, fetchOrders, fetchInvoices]);

  const findTable = useCallback((tableId: number) => tables.find((table) => table.id === tableId), [tables]);

  const getOrderForTable = useCallback(
    (tableId: number) => {
      const table = tables.find((item) => item.id === tableId);
      return (
        orders.find((order) => order.id === table?.currentOrderId) ??
        orders.find((order) => order.tableId === tableId && order.status !== "paid")
      );
    },
    [orders, tables],
  );

  const ensureOrderForTable = useCallback(
    async (tableId: number) => {
      const currentOrder = getOrderForTable(tableId);
      if (currentOrder) {
        return currentOrder;
      }

      // Backend createOrder automatically links table to the new order
      const order = await createOrder(tableId, 4);
      return order;
    },
    [createOrder, getOrderForTable],
  );

  return {
    tables,
    orders,
    findTable,
    getOrderForTable,
    ensureOrderForTable,
    setTableStatus,
    clearTable,
  };
}
