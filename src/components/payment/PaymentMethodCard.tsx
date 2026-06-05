import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";
import { PaymentMethod } from "@/types";

interface PaymentMethodCardProps {
  method: PaymentMethod;
  label: string;
  icon: string;
  backgroundColor: string;
  accentColor: string;
  selected: boolean;
  onPress: () => void;
}

export function PaymentMethodCard({
  label,
  icon,
  backgroundColor,
  accentColor,
  selected,
  onPress,
}: PaymentMethodCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor,
          borderColor: selected ? accentColor : "transparent",
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.chevron, { color: accentColor }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 2.5,
    flexDirection: "row",
    gap: 14,
    minHeight: 74,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderCurve: "continuous",
    borderRadius: 12,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    color: COLORS.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  chevron: {
    fontSize: 24,
    fontWeight: "900",
  },
});
