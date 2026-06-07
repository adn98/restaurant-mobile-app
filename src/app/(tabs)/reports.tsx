import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useNavigation } from "expo-router";

import { Card } from "@/components/ui/Card";
import { COLORS } from "@/constants/colors";
import { formatCurrency } from "@/utils/formatters";
import { apiFetch } from "@/utils/api";

function BarChart({
  title,
  subtitle,
  data,
  accent,
  compact = false,
}: {
  title: string;
  subtitle: string;
  data: { label: string; value: number }[];
  accent: string;
  compact?: boolean;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.chartTotal}>{formatCurrency(data.reduce((sum, item) => sum + item.value, 0))}</Text>
      </View>
      <View style={[styles.chartArea, compact && styles.compactChartArea]}>
        {data.map((item) => {
          const height = Math.max(18, Math.round((item.value / max) * (compact ? 88 : 120)));
          return (
            <View key={item.label} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height, backgroundColor: accent }]} />
              </View>
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string | number; tone?: "blue" | "green" | "orange" }) {
  const color = tone === "blue" ? COLORS.blue : tone === "green" ? COLORS.green : COLORS.primaryDark;

  return (
    <Card style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

export default function ReportsScreen() {
  const [pulse, setPulse] = useState<{ activeOrders: number; paidBills: number; todaySales: number; averageTicket: number } | null>(null);
  const [trends, setTrends] = useState<{ weekly: { label: string; value: number }[]; monthly: { label: string; value: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const loadReports = async () => {
    try {
      const [pulseData, trendsData] = await Promise.all([
        apiFetch("/api/admin/reports/sales-pulse"),
        apiFetch("/api/admin/reports/sales-trends"),
      ]);
      setPulse(pulseData);
      setTrends(trendsData);
    } catch (error) {
      console.error("Failed to load reports from database:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadReports();
    });
    
    const timer = setTimeout(() => {
      loadReports();
    }, 0);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const sales = pulse?.todaySales ?? 0;
  const paid = pulse?.paidBills ?? 0;
  const active = pulse?.activeOrders ?? 0;
  const averageTicket = Math.round(pulse?.averageTicket ?? 0);
  const weeklySales = trends?.weekly ?? [];
  const monthlySales = trends?.monthly ?? [];
  const monthlyTotal = monthlySales.reduce((sum, item) => sum + item.value, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.hero}>
        <View>
          <Text style={styles.kicker}>MANAGER REPORT</Text>
          <Text style={styles.heroTitle}>Sales pulse</Text>
          <Text style={styles.heroSubtitle}>Weekly rhythm, monthly trend, and table velocity.</Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeValue}>{formatCurrency(sales)}</Text>
          <Text style={styles.heroBadgeLabel}>today</Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard label="Active orders" value={active} />
        <MetricCard label="Paid bills" value={paid} tone="green" />
        <MetricCard label="Avg ticket" value={formatCurrency(averageTicket)} tone="blue" />
        <MetricCard label="Month pace" value={formatCurrency(Math.round(monthlyTotal / 1000) * 1000)} />
      </View>

      <BarChart
        title="Weekly sales"
        subtitle="Current service week"
        data={weeklySales}
        accent={COLORS.primary}
      />

      <BarChart
        title="Monthly sales"
        subtitle="6-month revenue trend"
        data={monthlySales}
        accent={COLORS.blue}
        compact
      />

      <Card style={styles.insightCard}>
        <Text style={styles.insightKicker}>Shift insight</Text>
        <Text style={styles.insightTitle}>Dinner rush is carrying the week.</Text>
        <Text style={styles.insightText}>
          Saturday is your strongest day. Keep one extra runner on floor from 7 pm to 10 pm and push fast-moving beverages on active tables.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.bg,
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 34,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  hero: {
    backgroundColor: COLORS.espresso,
    borderCurve: "continuous",
    borderRadius: 28,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    padding: 22,
  },
  kicker: {
    color: "#FDBA74",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
  },
  heroSubtitle: {
    color: "#D7CEC4",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
    maxWidth: 240,
  },
  heroBadge: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
    borderCurve: "continuous",
    borderRadius: 20,
    minWidth: 104,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  heroBadgeValue: {
    color: COLORS.white,
    fontSize: 19,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  heroBadgeLabel: {
    color: "#FFEAD9",
    fontSize: 11,
    fontWeight: "900",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    gap: 5,
    minHeight: 88,
    padding: 13,
    width: "48.6%",
  },
  metricValue: {
    fontSize: 21,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  metricLabel: {
    color: COLORS.textSec,
    fontSize: 11,
    fontWeight: "800",
  },
  chartCard: {
    gap: 16,
    padding: 16,
  },
  chartHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  chartTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: "900",
  },
  chartSubtitle: {
    color: COLORS.textSec,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  chartTotal: {
    color: COLORS.primaryDark,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  chartArea: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 9,
    height: 154,
  },
  compactChartArea: {
    height: 122,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  barTrack: {
    alignItems: "center",
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: "100%",
  },
  bar: {
    borderCurve: "continuous",
    borderRadius: 999,
    width: "100%",
  },
  barLabel: {
    color: COLORS.textSec,
    fontSize: 10,
    fontWeight: "900",
  },
  insightCard: {
    backgroundColor: COLORS.espresso,
    gap: 6,
    padding: 18,
  },
  insightKicker: {
    color: "#FDBA74",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  insightTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
  },
  insightText: {
    color: "#D7CEC4",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
});
