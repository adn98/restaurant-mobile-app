import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { COLORS } from "@/constants/colors";

interface ButtonProps extends PropsWithChildren {
  onPress?: () => void;
  variant?: "primary" | "secondary" | "success";
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ children, onPress, variant = "primary", disabled, style }: ButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  success: {
    backgroundColor: COLORS.green,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryLabel: {
    color: COLORS.text,
  },
});
