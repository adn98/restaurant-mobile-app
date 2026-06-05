import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, TABLE_STATUS_ACCENTS, TABLE_STATUS_COLORS } from "@/constants/colors";
import { formatCurrency } from "@/utils/formatters";
import { Order, Table } from "@/types";

interface TableCardProps {
  table: Table;
  order?: Order;
}

export function TableCard({ table, order }: TableCardProps) {
  const status = TABLE_STATUS_COLORS[table.status];
  const accent = TABLE_STATUS_ACCENTS[table.status];
  const occupied = table.status !== "empty";

  return (
    <Pressable
      onPress={() => router.push(`/table/${table.id}` as never)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: occupied ? status.bg : COLORS.white,
          borderColor: occupied ? `${status.bd}55` : status.bd,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.statusRail, { backgroundColor: accent.fill }]} />
      <View style={styles.topLine}>
        <View style={[styles.iconPlate, { backgroundColor: accent.tint }]}>
          <Text style={styles.icon}>🪑</Text>
        </View>
        {order?.items.length ? (
          <View style={[styles.countBadge, { backgroundColor: accent.fill }]}>
            <Text style={[styles.countText, { color: accent.text }]}>{order.items.length}</Text>
          </View>
        ) : null}
        {table.status === "paid" ? (
          <View style={[styles.countBadge, { backgroundColor: accent.fill }]}>
            <Text style={[styles.countText, { color: accent.text }]}>✓</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.mainLine}>
        <Text style={styles.name}>{table.name}</Text>
        <Text style={[styles.status, { color: status.fg }]}>{status.label}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.seats}>{table.seats} seats</Text>
        <Text style={[styles.amount, { color: occupied ? status.fg : COLORS.textSec }]}>
          {order?.total ? formatCurrency(order.total) : "Ready"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: "space-between",
    minHeight: 122,
    overflow: "hidden",
    padding: 11,
    position: "relative",
    boxShadow: "0 8px 22px rgba(35, 27, 19, 0.08)",
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  statusRail: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  topLine: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconPlate: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  countBadge: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: 7,
  },
  countText: {
    fontSize: 11,
    fontWeight: "900",
  },
  icon: {
    fontSize: 20,
  },
  mainLine: {
    gap: 2,
  },
  name: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
  },
  status: {
    fontSize: 11,
    fontWeight: "800",
  },
  footer: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  seats: {
    color: COLORS.textSec,
    fontSize: 10,
    fontWeight: "700",
  },
  amount: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
});
