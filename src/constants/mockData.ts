import { calculateOrder } from "@/utils/calculations";
import { Category, MenuItem, Order, Table } from "@/types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "popular", name: "Popular", icon: "★", sortOrder: 0 },
  { id: "breakfast", name: "Breakfast", icon: "☀", sortOrder: 1 },
  { id: "main", name: "Main Course", icon: "🍛", sortOrder: 2 },
  { id: "rice", name: "Rice", icon: "🍚", sortOrder: 3 },
  { id: "beverages", name: "Beverages", icon: "🥤", sortOrder: 4 },
  { id: "snacks", name: "Snacks", icon: "🍟", sortOrder: 5 },
  { id: "desserts", name: "Desserts", icon: "🍰", sortOrder: 6 },
];

export const DEFAULT_MENU: MenuItem[] = [
  { id: "m1", categoryId: "popular", name: "Tea", price: 10, emoji: "☕", isAvailable: true, isVeg: true },
  { id: "m2", categoryId: "popular", name: "Coffee", price: 20, emoji: "☕", isAvailable: true, isVeg: true },
  { id: "m3", categoryId: "popular", name: "Misal", price: 60, emoji: "🥘", isAvailable: true, isVeg: true },
  { id: "m4", categoryId: "popular", name: "Biryani", price: 180, emoji: "🍛", isAvailable: true, isVeg: false },
  { id: "m5", categoryId: "popular", name: "Coke", price: 40, emoji: "🥤", isAvailable: true, isVeg: true },
  { id: "m6", categoryId: "popular", name: "Lassi", price: 40, emoji: "🥛", isAvailable: true, isVeg: true },
  { id: "m7", categoryId: "popular", name: "Buttermilk", price: 30, emoji: "🥛", isAvailable: true, isVeg: true },
  { id: "m8", categoryId: "popular", name: "Paneer Tikka", price: 120, emoji: "🍢", isAvailable: true, isVeg: true },
  { id: "m9", categoryId: "breakfast", name: "Dosa", price: 60, emoji: "🫓", isAvailable: true, isVeg: true },
  { id: "m10", categoryId: "breakfast", name: "Idli", price: 40, emoji: "🍚", isAvailable: true, isVeg: true },
  { id: "m11", categoryId: "breakfast", name: "Poha", price: 30, emoji: "🍚", isAvailable: true, isVeg: true },
  { id: "m12", categoryId: "breakfast", name: "Upma", price: 35, emoji: "🍚", isAvailable: true, isVeg: true },
  { id: "m13", categoryId: "breakfast", name: "Paratha", price: 50, emoji: "🫓", isAvailable: true, isVeg: true },
  { id: "m14", categoryId: "breakfast", name: "Omelette", price: 40, emoji: "🍳", isAvailable: true, isVeg: false },
  { id: "m15", categoryId: "main", name: "Dal Makhani", price: 120, emoji: "🥘", isAvailable: true, isVeg: true },
  { id: "m16", categoryId: "main", name: "Butter Chicken", price: 180, emoji: "🍗", isAvailable: true, isVeg: false },
  { id: "m17", categoryId: "main", name: "Paneer Butter Masala", price: 150, emoji: "🥘", isAvailable: true, isVeg: true },
  { id: "m18", categoryId: "main", name: "Palak Paneer", price: 140, emoji: "🥬", isAvailable: true, isVeg: true },
  { id: "m19", categoryId: "main", name: "Chicken Curry", price: 170, emoji: "🍗", isAvailable: true, isVeg: false },
  { id: "m20", categoryId: "rice", name: "Biryani", price: 180, emoji: "🍛", isAvailable: true, isVeg: false },
  { id: "m21", categoryId: "rice", name: "Fried Rice", price: 120, emoji: "🍚", isAvailable: true, isVeg: true },
  { id: "m22", categoryId: "rice", name: "Pulao", price: 100, emoji: "🍚", isAvailable: true, isVeg: true },
  { id: "m23", categoryId: "rice", name: "Curd Rice", price: 80, emoji: "🍚", isAvailable: true, isVeg: true },
  { id: "m24", categoryId: "beverages", name: "Tea", price: 10, emoji: "☕", isAvailable: true, isVeg: true },
  { id: "m25", categoryId: "beverages", name: "Coffee", price: 20, emoji: "☕", isAvailable: true, isVeg: true },
  { id: "m26", categoryId: "beverages", name: "Lassi", price: 40, emoji: "🥛", isAvailable: true, isVeg: true },
  { id: "m27", categoryId: "beverages", name: "Coke", price: 40, emoji: "🥤", isAvailable: true, isVeg: true },
  { id: "m28", categoryId: "beverages", name: "Fresh Lime", price: 30, emoji: "🍋", isAvailable: true, isVeg: true },
  { id: "m29", categoryId: "beverages", name: "Mango Shake", price: 60, emoji: "🥭", isAvailable: true, isVeg: true },
  { id: "m30", categoryId: "snacks", name: "Paneer Tikka", price: 120, emoji: "🍢", isAvailable: true, isVeg: true },
  { id: "m31", categoryId: "snacks", name: "Pav Bhaji", price: 80, emoji: "🫓", isAvailable: true, isVeg: true },
  { id: "m32", categoryId: "snacks", name: "French Fries", price: 60, emoji: "🍟", isAvailable: true, isVeg: true },
  { id: "m33", categoryId: "snacks", name: "Spring Roll", price: 70, emoji: "🥚", isAvailable: true, isVeg: true },
  { id: "m34", categoryId: "desserts", name: "Gulab Jamun", price: 40, emoji: "🍮", isAvailable: true, isVeg: true },
  { id: "m35", categoryId: "desserts", name: "Ice Cream", price: 60, emoji: "🍨", isAvailable: true, isVeg: true },
  { id: "m36", categoryId: "desserts", name: "Kulfi", price: 50, emoji: "🍦", isAvailable: true, isVeg: true },
  { id: "m37", categoryId: "desserts", name: "Kheer", price: 45, emoji: "🍮", isAvailable: true, isVeg: true },
];

const seededOrderItems = [
  { menuItemId: "m1", name: "Tea", price: 10, qty: 2 },
  { menuItemId: "m2", name: "Coffee", price: 20, qty: 1 },
  { menuItemId: "m3", name: "Misal", price: 60, qty: 1 },
  { menuItemId: "m4", name: "Biryani", price: 180, qty: 1 },
  { menuItemId: "m5", name: "Coke", price: 40, qty: 1 },
];

const seedTotals = calculateOrder(seededOrderItems);

export const DEFAULT_ORDERS: Order[] = [
  {
    id: "ord_1025",
    tableId: 2,
    orderNo: "#1025",
    guests: 4,
    status: "open",
    items: seededOrderItems,
    ...seedTotals,
    openedAt: new Date().toISOString(),
  },
  {
    id: "ord_1024",
    tableId: 5,
    orderNo: "#1024",
    guests: 3,
    status: "open",
    items: [
      { menuItemId: "m9", name: "Dosa", price: 60, qty: 2 },
      { menuItemId: "m24", name: "Tea", price: 10, qty: 2 },
    ],
    ...calculateOrder([
      { menuItemId: "m9", name: "Dosa", price: 60, qty: 2 },
      { menuItemId: "m24", name: "Tea", price: 10, qty: 2 },
    ]),
    openedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
  },
  {
    id: "ord_1023",
    tableId: 9,
    orderNo: "#1023",
    guests: 2,
    status: "billed",
    items: [
      { menuItemId: "m16", name: "Butter Chicken", price: 180, qty: 1 },
      { menuItemId: "m20", name: "Biryani", price: 180, qty: 1 },
      { menuItemId: "m35", name: "Ice Cream", price: 60, qty: 1 },
    ],
    ...calculateOrder([
      { menuItemId: "m16", name: "Butter Chicken", price: 180, qty: 1 },
      { menuItemId: "m20", name: "Biryani", price: 180, qty: 1 },
      { menuItemId: "m35", name: "Ice Cream", price: 60, qty: 1 },
    ]),
    openedAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
  },
];

export const DEFAULT_TABLES: Table[] = Array.from({ length: 12 }, (_, index) => {
  const id = index + 1;
  const order = DEFAULT_ORDERS.find((item) => item.tableId === id);
  return {
    id,
    name: `T${id}`,
    seats: 4,
    status: id === 12 ? "paid" : order?.status === "billed" ? "bill" : order ? "active" : "empty",
    currentOrderId: order?.id,
  };
});
