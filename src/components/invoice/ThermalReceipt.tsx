import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";
import { formatCurrency, formatDate, formatTime } from "@/utils/formatters";
import { AppSettings, Invoice } from "@/types";

interface ThermalReceiptProps {
  invoice: Invoice;
  settings: AppSettings;
}

export function ThermalReceipt({ invoice, settings }: ThermalReceiptProps) {
  return (
    <View style={styles.receipt}>
      <View style={styles.header}>
        <Text style={styles.restaurant}>{settings.restaurantName.toUpperCase()}</Text>
        <Text style={styles.sub}>{settings.address}</Text>
        <Text style={styles.sub}>GST: {settings.gstNumber}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.mono}>Table   : {invoice.tableId}</Text>
        <Text style={styles.mono}>
          Date    : {formatDate(invoice.createdAt)} {formatTime(invoice.createdAt)}
        </Text>
        <Text style={styles.mono}>Bill No : {invoice.orderNo}</Text>
        <Text style={styles.mono}>Payment : {invoice.paymentMethod.toUpperCase()}</Text>
      </View>
      <View style={styles.items}>
        {invoice.items.map((item) => (
          <View key={item.menuItemId} style={styles.itemRow}>
            <Text numberOfLines={1} style={[styles.mono, styles.itemName]}>
              {item.name}
            </Text>
            <Text style={[styles.mono, styles.qty]}>x{item.qty}</Text>
            <Text style={[styles.mono, styles.itemAmount]}>{formatCurrency(item.price * item.qty)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totals}>
        <View style={styles.row}>
          <Text style={styles.mono}>Subtotal</Text>
          <Text style={styles.mono}>{formatCurrency(invoice.subtotal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.mono}>GST ({settings.gstPercent}%)</Text>
          <Text style={styles.mono}>{formatCurrency(invoice.gstAmount)}</Text>
        </View>
      </View>
      <View style={styles.grand}>
        <Text style={styles.grandText}>TOTAL</Text>
        <Text style={styles.grandText}>{formatCurrency(invoice.total)}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.thanks}>Thank You!</Text>
        <Text style={styles.sub}>Visit Again</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: {
    backgroundColor: COLORS.white,
    borderCurve: "continuous",
    borderRadius: 4,
    maxWidth: 330,
    paddingHorizontal: 20,
    paddingVertical: 22,
    width: "100%",
  },
  header: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  restaurant: {
    color: COLORS.text,
    fontFamily: "monospace",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 3,
  },
  sub: {
    color: COLORS.textSec,
    fontFamily: "monospace",
    fontSize: 10,
    marginTop: 2,
  },
  meta: {
    gap: 3,
    paddingVertical: 12,
  },
  mono: {
    color: COLORS.text,
    fontFamily: "monospace",
    fontSize: 12,
  },
  items: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 7,
    paddingVertical: 10,
  },
  itemRow: {
    flexDirection: "row",
    gap: 6,
  },
  itemName: {
    flex: 1,
  },
  qty: {
    textAlign: "center",
    width: 34,
  },
  itemAmount: {
    textAlign: "right",
    width: 62,
  },
  totals: {
    gap: 5,
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grand: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
  },
  grandText: {
    color: COLORS.text,
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "900",
  },
  footer: {
    alignItems: "center",
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  thanks: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
});
