import { create } from "zustand";
import { Table, TableStatus } from "@/types";
import { apiFetch } from "@/utils/api";

interface TableStore {
  tables: Table[];
  loading: boolean;
  fetchTables: () => Promise<void>;
  setTableStatus: (id: number, status: Table["status"]) => Promise<void>;
  setTableOrder: (id: number, orderId: string) => Promise<void>;
  clearTable: (id: number) => Promise<void>;
}

export const useTableStore = create<TableStore>()((set, get) => ({
  tables: [],
  loading: false,
  fetchTables: async () => {
    set({ loading: true });
    try {
      const data = await apiFetch("/api/tables");
      // Map API TableStatus to mobile UI types (e.g. TableStatus mapping matches)
      set({ tables: data, loading: false });
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      set({ loading: false });
    }
  },
  setTableStatus: async (id, status) => {
    try {
      const updated = await apiFetch(`/api/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      set((state) => ({
        tables: state.tables.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (error) {
      console.error(`Failed to update table ${id} status:`, error);
    }
  },
  setTableOrder: async (id, orderId) => {
    try {
      const updated = await apiFetch(`/api/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active", currentOrderId: orderId }),
      });
      set((state) => ({
        tables: state.tables.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (error) {
      console.error(`Failed to assign order to table ${id}:`, error);
    }
  },
  clearTable: async (id) => {
    try {
      const updated = await apiFetch(`/api/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "empty", currentOrderId: null }),
      });
      set((state) => ({
        tables: state.tables.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (error) {
      console.error(`Failed to clear table ${id}:`, error);
    }
  },
}));
