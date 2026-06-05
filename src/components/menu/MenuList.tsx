import { FlatList, StyleSheet, Text, View } from "react-native";

import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { COLORS } from "@/constants/colors";
import { MenuItem } from "@/types";

interface MenuListProps {
  title: string;
  items: MenuItem[];
  getQty: (itemId: string) => number;
  onChangeQty: (item: MenuItem, qty: number) => void;
}

export function MenuList({ title, items, getQty, onChangeQty }: MenuListProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title} Items</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MenuItemCard item={item} qty={getQty(item.id)} onChangeQty={(qty) => onChangeQty(item, qty)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  list: {
    gap: 8,
    paddingBottom: 20,
  },
});
