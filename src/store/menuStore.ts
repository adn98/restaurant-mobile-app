import { create } from "zustand";

import { DEFAULT_CATEGORIES, DEFAULT_MENU } from "@/constants/mockData";
import { Category, MenuItem } from "@/types";

interface MenuStore {
  categories: Category[];
  menuItems: MenuItem[];
}

export const useMenuStore = create<MenuStore>(() => ({
  categories: DEFAULT_CATEGORIES,
  menuItems: DEFAULT_MENU,
}));
