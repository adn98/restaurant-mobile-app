import { StyleSheet, Text, View } from "react-native";

import { QtyControl } from "@/components/ui/QtyControl";
import { COLORS } from "@/constants/colors";
import { formatCurrency } from "@/utils/formatters";
import { MenuItem } from "@/types";

interface MenuItemCardProps {
  item: MenuItem;
  qty: number;
  onChangeQty: (qty: number) => void;
}

export function MenuItemCard({ item, qty, onChangeQty }: MenuItemCardProps) {
  return (
    <View style={[styles.card, qty > 0 && styles.selected]}>
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <Text style={styles.price}>{formatCurrency(item.price)}</Text>
      </View>
      <QtyControl qty={qty} onDecrement={() => onChangeQty(Math.max(0, qty - 1))} onIncrement={() => onChangeQty(qty + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderCurve: "continuous",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  selected: {
    borderColor: COLORS.primaryMid,
    borderWidth: 1.5,
  },
  emojiBox: {
    alignItems: "center",
    backgroundColor: COLORS.grayLight,
    borderCurve: "continuous",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  emoji: {
    fontSize: 18,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
  price: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
});
