import { OrderItem } from "@/types";
import { APP_CONFIG } from "@/constants/config";

export function calculateOrder(items: OrderItem[], gstPercent = APP_CONFIG.gstPercent) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const gstAmount = Math.round(subtotal * (gstPercent / 100));
  return {
    subtotal,
    gstAmount,
    total: subtotal + gstAmount,
  };
}
