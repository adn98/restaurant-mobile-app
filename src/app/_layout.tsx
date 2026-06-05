import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { COLORS } from "@/constants/colors";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: COLORS.bg },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: COLORS.white },
          headerTintColor: COLORS.text,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="table/[id]" options={{ title: "Table Order" }} />
        <Stack.Screen name="payment/[tableId]" options={{ title: "Receive Payment" }} />
        <Stack.Screen name="invoice/[orderId]" options={{ title: "Invoice" }} />
      </Stack>
    </>
  );
}
