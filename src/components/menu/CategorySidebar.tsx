import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";
import { Category } from "@/types";

interface CategorySidebarProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function CategorySidebar({ categories, selectedId, onSelect }: CategorySidebarProps) {
  return (
    <View style={styles.wrap}>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              onPress={() => onSelect(item.id)}
              style={[styles.category, selected && styles.selectedCategory]}
            >
              <View style={[styles.iconBox, selected && styles.selectedIconBox]}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>
              <Text numberOfLines={2} style={[styles.name, selected && styles.selectedName]}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderRightColor: COLORS.border,
    borderRightWidth: 1,
    width: 72,
  },
  category: {
    alignItems: "center",
    borderLeftColor: "transparent",
    borderLeftWidth: 3,
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  selectedCategory: {
    backgroundColor: COLORS.primaryLight,
    borderLeftColor: COLORS.primary,
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: COLORS.grayLight,
    borderCurve: "continuous",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  selectedIconBox: {
    backgroundColor: COLORS.primary,
  },
  icon: {
    fontSize: 17,
  },
  name: {
    color: COLORS.textSec,
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 11,
    textAlign: "center",
  },
  selectedName: {
    color: COLORS.primary,
    fontWeight: "900",
  },
});
