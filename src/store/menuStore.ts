import { create } from "zustand";
import { Category, MenuItem } from "@/types";
import { apiFetch } from "@/utils/api";

interface MenuStore {
  categories: Category[];
  menuItems: MenuItem[];
  loading: boolean;
  fetchMenu: () => Promise<void>;
}

export const useMenuStore = create<MenuStore>((set) => ({
  categories: [],
  menuItems: [],
  loading: false,
  fetchMenu: async () => {
    set({ loading: true });
    try {
      const categories = await apiFetch("/api/categories");
      const menuItems = await apiFetch("/api/menu");
      set({ categories, menuItems, loading: false });
    } catch (error) {
      console.error("Failed to fetch menu:", error);
      set({ loading: false });
    }
  },
}));
