import { Tabs } from "expo-router";
import { ColorValue, Text } from "react-native";

import { COLORS } from "@/constants/colors";

function TabIcon({ icon, color }: { icon: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 19 }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: {
          color: COLORS.text,
          fontSize: 24,
          fontWeight: "900",
        },
        headerTintColor: COLORS.text,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarItemStyle: {
          borderCurve: "continuous",
          borderRadius: 16,
          marginHorizontal: 4,
          marginVertical: 7,
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
        },
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: 74,
          paddingBottom: 8,
          paddingTop: 6,
          boxShadow: "0 -8px 28px rgba(35, 27, 19, 0.08)",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon icon="⊞" color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => <TabIcon icon="🍽" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <TabIcon icon="☷" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) => <TabIcon icon="▥" color={color} />,
        }}
      />
    </Tabs>
  );
}
