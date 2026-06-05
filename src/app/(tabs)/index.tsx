import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { TableGrid } from "@/components/tables/TableGrid";
import { COLORS, TABLE_STATUS_COLORS } from "@/constants/colors";
import { useTables } from "@/hooks/useTables";
import { formatCurrency, formatTime } from "@/utils/formatters";

export default function DashboardScreen() {
  const { tables, orders, getOrderForTable } = useTables();
  const openOrders = orders.filter((order) => order.status !== "paid");
  const todaysSales = orders.reduce((sum, order) => sum + order.total, 10890);
  const latestOrder = [...orders].sort((a, b) => b.openedAt.localeCompare(a.openedAt))[0];
  const activeTables = tables.filter((table) => table.status === "active").length;
  const billedTables = tables.filter((table) => table.status === "bill").length;
  const paidTables = tables.filter((table) => table.status === "paid").length;
  const emptyTables = tables.filter((table) => table.status === "empty").length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.kicker}>DINING ROOM LIVE</Text>
            <Text style={styles.heroTitle}>Hotel Grand</Text>
          </View>
          <View style={styles.servicePill}>
            <View style={styles.liveDot} />
            <Text style={styles.serviceText}>Service on</Text>
          </View>
        </View>
        <View style={styles.heroBottom}>
          <View>
            <Text style={styles.heroLabel}>Today Sales</Text>
            <Text style={styles.heroValue}>{formatCurrency(todaysSales)}</Text>
            <Text style={styles.heroGood}>↑ 18% vs yesterday</Text>
          </View>
          <View style={styles.orderBadge}>
            <Text style={styles.orderCount}>{74 + openOrders.length}</Text>
            <Text style={styles.orderLabel}>orders</Text>
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>{activeTables}</Text>
          <Text style={styles.metricLabel}>Active</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={[styles.metricValue, styles.billMetric]}>{billedTables}</Text>
          <Text style={styles.metricLabel}>Bills</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={[styles.metricValue, styles.paidMetric]}>{paidTables}</Text>
          <Text style={styles.metricLabel}>Paid</Text>
        </Card>
        <Card style={styles.metricCard}>
          <Text style={styles.metricValue}>{emptyTables}</Text>
          <Text style={styles.metricLabel}>Open</Text>
        </Card>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.title}>Tables</Text>
          <Text style={styles.subtitle}>Last updated {latestOrder ? formatTime(latestOrder.openedAt) : "09:41 AM"}</Text>
        </View>
        <View style={styles.liveOrdersPill}>
          <Text style={styles.liveOrdersText}>{openOrders.length} live orders</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {Object.entries(TABLE_STATUS_COLORS).map(([key, value]) => (
          <View key={key} style={[styles.legendItem, { backgroundColor: value.bg, borderColor: value.bd }]}>
            <View style={[styles.dot, { backgroundColor: value.dot }]} />
            <Text style={styles.legendText}>{value.label}</Text>
          </View>
        ))}
      </View>

      <TableGrid tables={tables} getOrderForTable={getOrderForTable} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.bg,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: COLORS.espresso,
    borderCurve: "continuous",
    borderRadius: 28,
    gap: 24,
    overflow: "hidden",
    padding: 22,
    boxShadow: "0 18px 38px rgba(43, 33, 24, 0.20)",
  },
  heroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  kicker: {
    color: "#FDBA74",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  servicePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  liveDot: {
    backgroundColor: COLORS.green,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  serviceText: {
    color: "#F8FAFC",
    fontSize: 11,
    fontWeight: "800",
  },
  heroBottom: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroLabel: {
    color: "#C7BFB6",
    fontSize: 12,
    fontWeight: "800",
  },
  heroValue: {
    color: COLORS.white,
    fontSize: 34,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    marginTop: 2,
  },
  heroGood: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  orderBadge: {
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderCurve: "continuous",
    borderRadius: 20,
    minWidth: 78,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  orderCount: {
    color: COLORS.white,
    fontSize: 25,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  orderLabel: {
    color: "#FFEAD9",
    fontSize: 11,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 13,
    boxShadow: "0 8px 22px rgba(35, 27, 19, 0.07)",
  },
  metricValue: {
    color: COLORS.primaryDark,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  billMetric: {
    color: COLORS.blue,
  },
  paidMetric: {
    color: COLORS.slate,
  },
  metricLabel: {
    color: COLORS.textSec,
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  title: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textSec,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  liveOrdersPill: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveOrdersText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendItem: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendText: {
    color: COLORS.slate,
    fontSize: 11,
    fontWeight: "800",
  },
});
