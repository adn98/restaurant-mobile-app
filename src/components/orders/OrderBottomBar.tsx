import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { COLORS } from "@/constants/colors";

interface OrderBottomBarProps {
  onKotPress: () => void;
}

export function OrderBottomBar({ onKotPress }: OrderBottomBarProps) {
  return (
    <View style={styles.bar}>
      <Button variant="secondary" style={styles.sideButton}>
        Hold
      </Button>
      <Button style={styles.centerButton}>+ Add Custom Item</Button>
      <Button variant="secondary" onPress={onKotPress} style={styles.sideButton}>
        KOT
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.white,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sideButton: {
    minHeight: 42,
    paddingHorizontal: 12,
  },
  centerButton: {
    flex: 1,
    minHeight: 42,
  },
});
