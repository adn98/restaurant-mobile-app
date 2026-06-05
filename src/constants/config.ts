import { AppSettings } from "@/types";

export const APP_CONFIG = {
  gstPercent: 5,
  lowStockWarning: 8,
};

export const DEFAULT_SETTINGS: AppSettings = {
  restaurantName: "Hotel Grand",
  address: "123 MG Road, Your City",
  gstNumber: "07AABC1234D1Z5",
  gstPercent: APP_CONFIG.gstPercent,
  currency: "₹",
  tableCount: 12,
};
