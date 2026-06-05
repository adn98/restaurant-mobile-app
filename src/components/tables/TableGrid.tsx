import { FlatList, StyleSheet, View } from "react-native";

import { TableCard } from "@/components/tables/TableCard";
import { Order, Table } from "@/types";

interface TableGridProps {
  tables: Table[];
  getOrderForTable: (tableId: number) => Order | undefined;
}

export function TableGrid({ tables, getOrderForTable }: TableGridProps) {
  return (
    <FlatList
      data={tables}
      keyExtractor={(item) => String(item.id)}
      numColumns={3}
      scrollEnabled={false}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => (
        <View style={styles.item}>
          <TableCard table={item} order={getOrderForTable(item.id)} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  row: {
    gap: 12,
  },
  item: {
    flex: 1,
    maxWidth: "31.8%",
    minWidth: 0,
  },
});
