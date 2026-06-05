import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { COLORS } from "@/constants/colors";
import { formatCurrency, formatTime } from "@/utils/formatters";
import { Order, Table } from "@/types";

interface BillSummaryCardProps {
  table: Table;
  order: Order;
}

export function BillSummaryCard({ table, order }: BillSummaryCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🪑</Text>
        </View>
        <View style={styles.titleWrap}>
          <View style={styles.titleLine}>
            <Text style={styles.tableName}>Table {table.id}</Text>
            <Badge label="Bill Amount" />
          </View>
          <Text style={styles.amount}>{formatCurrency(order.total)}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText}>Guests: {order.guests}</Text>
        <Text style={styles.metaText}>Order: {order.orderNo}</Text>
        <Text style={styles.metaText}>{formatTime(order.openedAt)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderCurve: "continuous",
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  icon: {
    fontSize: 24,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 3,
  },
  tableName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  amount: {
    color: COLORS.primary,
    fontSize: 30,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  meta: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingTop: 10,
  },
  metaText: {
    color: COLORS.textSec,
    fontSize: 11,
    fontWeight: "600",
  },
});
