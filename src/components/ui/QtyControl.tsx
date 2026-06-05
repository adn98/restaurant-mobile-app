import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";

interface QtyControlProps {
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function QtyControl({ qty, onIncrement, onDecrement }: QtyControlProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onDecrement} style={[styles.button, qty > 0 && styles.activeButton]}>
        <Text style={[styles.buttonText, qty > 0 && styles.activeButtonText]}>-</Text>
      </Pressable>
      <Text style={styles.qty}>{qty}</Text>
      <Pressable onPress={onIncrement} style={[styles.button, styles.activeButton]}>
        <Text style={[styles.buttonText, styles.activeButtonText]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  button: {
    alignItems: "center",
    borderColor: COLORS.primary,
    borderCurve: "continuous",
    borderRadius: 7,
    borderWidth: 1.5,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  activeButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 21,
  },
  activeButtonText: {
    color: COLORS.white,
  },
  qty: {
    color: COLORS.text,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    minWidth: 16,
    textAlign: "center",
  },
});
