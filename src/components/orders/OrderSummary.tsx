import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { COLORS } from "@/constants/colors";
import { formatCurrency } from "@/utils/formatters";
import { Order } from "@/types";

interface OrderSummaryProps {
  order: Order;
  onReviewBill: () => void;
}

export function OrderSummary({ order, onReviewBill }: OrderSummaryProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Order Summary</Text>
      <View style={styles.items}>
        {order.items.map((item) => (
          <View key={item.menuItemId} style={styles.itemRow}>
            <View style={styles.itemName}>
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text style={styles.qty}>x{item.qty}</Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(item.price * item.qty)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>GST (5%)</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.gstAmount)}</Text>
        </View>
        <View style={styles.grandRow}>
          <Text style={styles.grandLabel}>Total</Text>
          <Text style={styles.grandValue}>{formatCurrency(order.total)}</Text>
        </View>
      </View>
      <Button onPress={onReviewBill} disabled={order.items.length === 0} style={styles.reviewButton}>
        Review Bill →
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.white,
    borderLeftColor: COLORS.border,
    borderLeftWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 10,
    width: 142,
  },
  title: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  items: {
    flex: 1,
    gap: 6,
  },
  itemRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  itemName: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
  },
  qty: {
    color: COLORS.textSec,
    fontSize: 9,
  },
  amount: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800",
  },
  totals: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    color: COLORS.textSec,
    fontSize: 10,
  },
  totalValue: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 3,
  },
  grandLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  grandValue: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  reviewButton: {
    marginTop: 8,
    minHeight: 40,
  },
});
