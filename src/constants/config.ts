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

export const API_BASE = "http://localhost:3000"; // Replace with your live AWS IP (e.g. http://3.110.217.72) or hostname in production
export const MOBILE_APP_API_KEY = "pos-mobile-app-traffic-filter-key-123-abc";

