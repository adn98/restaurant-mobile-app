import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { BillSummaryCard } from "@/components/payment/BillSummaryCard";
import { PaymentMethodCard } from "@/components/payment/PaymentMethodCard";
import { COLORS } from "@/constants/colors";
import { useOrder } from "@/hooks/useOrder";
import { useTables } from "@/hooks/useTables";
import { PaymentMethod } from "@/types";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  icon: string;
  bg: string;
  accent: string;
}[] = [
  { id: "cash", label: "Cash", icon: "💵", bg: COLORS.greenLight, accent: COLORS.green },
  { id: "upi", label: "UPI", icon: "📱", bg: COLORS.blueLight, accent: COLORS.blue },
  { id: "card", label: "Card", icon: "💳", bg: COLORS.purpleLight, accent: COLORS.purple },
  { id: "credit", label: "Credit", icon: "📄", bg: COLORS.yellowLight, accent: COLORS.yellow },
];

export default function PaymentScreen() {
  const { tableId: tableIdParam } = useLocalSearchParams<{ tableId: string }>();
  const tableId = Number(tableIdParam);
  const { findTable } = useTables();
  const { getOrderForTable, closeOrder } = useOrder();
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  const table = findTable(tableId);
  const order = getOrderForTable(tableId);

  function confirmPayment() {
    if (!order || !method) {
      return;
    }
    const invoice = closeOrder(order.id, method);
    router.replace(`/invoice/${invoice.orderId}` as never);
  }

  if (!table || !order) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyText}>Bill not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        <BillSummaryCard table={table} order={order} />
        <View style={styles.copy}>
          <Text style={styles.title}>Select Payment Method</Text>
          <Text style={styles.subtitle}>Tap an option below to receive payment</Text>
        </View>
        <View style={styles.methods}>
          {PAYMENT_METHODS.map((item) => (
            <PaymentMethodCard
              key={item.id}
              method={item.id}
              label={item.label}
              icon={item.icon}
              backgroundColor={item.bg}
              accentColor={item.accent}
              selected={method === item.id}
              onPress={() => setMethod(item.id)}
            />
          ))}
        </View>
        <View style={styles.note}>
          <Text style={styles.noteIcon}>🛡</Text>
          <Text style={styles.noteText}>Payment will be marked as completed after confirmation</Text>
        </View>
      </ScrollView>
      {method ? (
        <View style={styles.footer}>
          <Button onPress={confirmPayment}>Confirm — Pay via {PAYMENT_METHODS.find((item) => item.id === method)?.label}</Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.bg,
    flex: 1,
  },
  emptyScreen: {
    alignItems: "center",
    backgroundColor: COLORS.bg,
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    color: COLORS.textSec,
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    gap: 18,
    padding: 14,
    paddingBottom: 28,
  },
  copy: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.textSec,
    fontSize: 12,
  },
  methods: {
    gap: 11,
  },
  note: {
    alignItems: "center",
    backgroundColor: COLORS.greenLight,
    borderCurve: "continuous",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  noteIcon: {
    color: COLORS.green,
    fontSize: 16,
  },
  noteText: {
    color: COLORS.textSec,
    flex: 1,
    fontSize: 12,
  },
  footer: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    padding: 14,
  },
});
