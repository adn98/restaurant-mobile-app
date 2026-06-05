import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";

interface BadgeProps {
  label: string;
  tone?: "orange" | "blue" | "green" | "gray";
}

const tones = {
  orange: { bg: COLORS.primaryLight, fg: COLORS.primary },
  blue: { bg: COLORS.blueLight, fg: COLORS.blue },
  green: { bg: COLORS.greenLight, fg: COLORS.green },
  gray: { bg: COLORS.grayLight, fg: COLORS.textSec },
};

export function Badge({ label, tone = "orange" }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: tones[tone].bg }]}>
      <Text style={[styles.label, { color: tones[tone].fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderCurve: "continuous",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
  },
});
