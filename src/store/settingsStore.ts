import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_SETTINGS } from "@/constants/config";
import { AppSettings } from "@/types";
import { apiFetch } from "@/utils/api";

interface SettingsStore {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  fetchSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
      fetchSettings: async () => {
        try {
          const data = await apiFetch("/api/settings");
          set({ settings: data });
        } catch (error) {
          console.error("Failed to sync settings from server:", error);
        }
      },
    }),
    {
      name: "pos-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
