import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { COLORS } from "@/constants/colors";

interface CardProps extends PropsWithChildren {
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0 8px 22px rgba(35, 27, 19, 0.07)",
  },
});
