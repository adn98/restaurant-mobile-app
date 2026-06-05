import { useCallback } from "react";

import { useOrderStore } from "@/store/orderStore";
import { useTableStore } from "@/store/tableStore";

export function useTables() {
  const tables = useTableStore((state) => state.tables);
  const setTableOrder = useTableStore((state) => state.setTableOrder);
  const setTableStatus = useTableStore((state) => state.setTableStatus);
  const clearTable = useTableStore((state) => state.clearTable);
  const orders = useOrderStore((state) => state.orders);
  const createOrder = useOrderStore((state) => state.createOrder);

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
    (tableId: number) => {
      const currentOrder = getOrderForTable(tableId);
      if (currentOrder) {
        return currentOrder;
      }

      const order = createOrder(tableId, 4);
      setTableOrder(tableId, order.id);
      return order;
    },
    [createOrder, getOrderForTable, setTableOrder],
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
