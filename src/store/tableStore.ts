import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_TABLES } from "@/constants/mockData";
import { Table } from "@/types";

interface TableStore {
  tables: Table[];
  setTableStatus: (id: number, status: Table["status"]) => void;
  setTableOrder: (id: number, orderId: string) => void;
  clearTable: (id: number) => void;
}

export const useTableStore = create<TableStore>()(
  persist(
    (set) => ({
      tables: DEFAULT_TABLES,
      setTableStatus: (id, status) =>
        set((state) => ({
          tables: state.tables.map((table) => (table.id === id ? { ...table, status } : table)),
        })),
      setTableOrder: (id, orderId) =>
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === id ? { ...table, currentOrderId: orderId, status: "active" } : table,
          ),
        })),
      clearTable: (id) =>
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === id ? { ...table, currentOrderId: undefined, status: "empty" } : table,
          ),
        })),
    }),
    {
      name: "pos-tables",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
