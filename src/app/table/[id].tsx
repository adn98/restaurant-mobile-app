import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { CategorySidebar } from "@/components/menu/CategorySidebar";
import { MenuList } from "@/components/menu/MenuList";
import { OrderBottomBar } from "@/components/orders/OrderBottomBar";
import { OrderSummary } from "@/components/orders/OrderSummary";
import { COLORS } from "@/constants/colors";
import { useMenu } from "@/hooks/useMenu";
import { useOrder } from "@/hooks/useOrder";
import { useTables } from "@/hooks/useTables";
import { formatTime } from "@/utils/formatters";
import { MenuItem } from "@/types";

export default function TableOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tableId = Number(id);
  const { findTable, ensureOrderForTable } = useTables();
  const { categories } = useMenu();
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id ?? "popular");
  const { getOrderForTable, updateOrderItem, generateBill } = useOrder();

  useEffect(() => {
    if (Number.isFinite(tableId)) {
      ensureOrderForTable(tableId);
    }
  }, [ensureOrderForTable, tableId]);

  const table = findTable(tableId);
  const order = getOrderForTable(tableId);
  const activeCategory = categories.find((category) => category.id === selectedCategory);
  const { items } = useMenu(selectedCategory);

  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    order?.items.forEach((item) => map.set(item.menuItemId, item.qty));
    return map;
  }, [order?.items]);

  function changeQty(item: MenuItem, qty: number) {
    if (!order) {
      return;
    }
    updateOrderItem(order.id, item, qty);
  }

  function reviewBill() {
    if (!order) {
      return;
    }
    generateBill(order.id);
    router.push(`/payment/${tableId}` as never);
  }

  if (!table || !order) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyText}>Preparing table...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>👥</Text>
          <View>
            <Text style={styles.infoLabel}>Guests</Text>
            <Text style={styles.infoValue}>{order.guests}</Text>
          </View>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>🕐</Text>
          <View>
            <Text style={styles.infoLabel}>Opened At</Text>
            <Text style={styles.infoValue}>{formatTime(order.openedAt)}</Text>
          </View>
        </View>
        <View style={styles.infoItemLast}>
          <Text style={styles.infoIcon}>📋</Text>
          <View>
            <Text style={styles.infoLabel}>Order No.</Text>
            <Text style={styles.infoValue}>{order.orderNo}</Text>
          </View>
        </View>
        <Badge label={order.status === "billed" ? "Bill Ready" : "Active"} />
      </View>

      <View style={styles.body}>
        <CategorySidebar categories={categories} selectedId={selectedCategory} onSelect={setSelectedCategory} />
        <MenuList
          title={activeCategory?.name ?? "Menu"}
          items={items}
          getQty={(itemId) => qtyById.get(itemId) ?? 0}
          onChangeQty={changeQty}
        />
        <OrderSummary order={order} onReviewBill={reviewBill} />
      </View>

      <OrderBottomBar onKotPress={() => Alert.alert("KOT ready", "Kitchen Order Ticket print is UI-only for this MVP.")} />
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
  infoBar: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  infoItem: {
    alignItems: "center",
    borderRightColor: COLORS.border,
    borderRightWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    paddingRight: 6,
  },
  infoItemLast: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoLabel: {
    color: COLORS.textSec,
    fontSize: 9,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  body: {
    flex: 1,
    flexDirection: "row",
  },
});
