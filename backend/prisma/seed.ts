import { PrismaClient, TableStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { tempId: "popular", name: "Popular", icon: "★", sortOrder: 0 },
  { tempId: "breakfast", name: "Breakfast", icon: "☀", sortOrder: 1 },
  { tempId: "main", name: "Main Course", icon: "🍛", sortOrder: 2 },
  { tempId: "rice", name: "Rice", icon: "🍚", sortOrder: 3 },
  { tempId: "beverages", name: "Beverages", icon: "🥤", sortOrder: 4 },
  { tempId: "snacks", name: "Snacks", icon: "🍟", sortOrder: 5 },
  { tempId: "desserts", name: "Desserts", icon: "🍰", sortOrder: 6 },
];

const DEFAULT_MENU = [
  { tempId: "m1", categoryTempId: "popular", name: "Tea", price: 10, emoji: "☕", isAvailable: true, isVeg: true },
  { tempId: "m2", categoryTempId: "popular", name: "Coffee", price: 20, emoji: "☕", isAvailable: true, isVeg: true },
  { tempId: "m3", categoryTempId: "popular", name: "Misal", price: 60, emoji: "🥘", isAvailable: true, isVeg: true },
  { tempId: "m4", categoryTempId: "popular", name: "Biryani", price: 180, emoji: "🍛", isAvailable: true, isVeg: false },
  { tempId: "m5", categoryTempId: "popular", name: "Coke", price: 40, emoji: "🥤", isAvailable: true, isVeg: true },
  { tempId: "m6", categoryTempId: "popular", name: "Lassi", price: 40, emoji: "🥛", isAvailable: true, isVeg: true },
  { tempId: "m7", categoryTempId: "popular", name: "Buttermilk", price: 30, emoji: "🥛", isAvailable: true, isVeg: true },
  { tempId: "m8", categoryTempId: "popular", name: "Paneer Tikka", price: 120, emoji: "🍢", isAvailable: true, isVeg: true },
  { tempId: "m9", categoryTempId: "breakfast", name: "Dosa", price: 60, emoji: "🫓", isAvailable: true, isVeg: true },
  { tempId: "m10", categoryTempId: "breakfast", name: "Idli", price: 40, emoji: "🍚", isAvailable: true, isVeg: true },
  { tempId: "m11", categoryTempId: "breakfast", name: "Poha", price: 30, emoji: "🍚", isAvailable: true, isVeg: true },
  { tempId: "m12", categoryTempId: "breakfast", name: "Upma", price: 35, emoji: "🍚", isAvailable: true, isVeg: true },
  { tempId: "m13", categoryTempId: "breakfast", name: "Paratha", price: 50, emoji: "🫓", isAvailable: true, isVeg: true },
  { tempId: "m14", categoryTempId: "breakfast", name: "Omelette", price: 40, emoji: "🍳", isAvailable: true, isVeg: false },
  { tempId: "m15", categoryTempId: "main", name: "Dal Makhani", price: 120, emoji: "🥘", isAvailable: true, isVeg: true },
  { tempId: "m16", categoryTempId: "main", name: "Butter Chicken", price: 180, emoji: "🍗", isAvailable: true, isVeg: false },
  { tempId: "m17", categoryTempId: "main", name: "Paneer Butter Masala", price: 150, emoji: "🥘", isAvailable: true, isVeg: true },
  { tempId: "m18", categoryTempId: "main", name: "Palak Paneer", price: 140, emoji: "🥬", isAvailable: true, isVeg: true },
  { tempId: "m19", categoryTempId: "main", name: "Chicken Curry", price: 170, emoji: "🍗", isAvailable: true, isVeg: false },
  { tempId: "m20", categoryTempId: "rice", name: "Biryani", price: 180, emoji: "🍛", isAvailable: true, isVeg: false },
  { tempId: "m21", categoryTempId: "rice", name: "Fried Rice", price: 120, emoji: "🍚", isAvailable: true, isVeg: true },
  { tempId: "m22", categoryTempId: "rice", name: "Pulao", price: 100, emoji: "🍚", isAvailable: true, isVeg: true },
  { tempId: "m23", categoryTempId: "rice", name: "Curd Rice", price: 80, emoji: "🍚", isAvailable: true, isVeg: true },
  { tempId: "m24", categoryTempId: "beverages", name: "Tea", price: 10, emoji: "☕", isAvailable: true, isVeg: true },
  { tempId: "m25", categoryTempId: "beverages", name: "Coffee", price: 20, emoji: "☕", isAvailable: true, isVeg: true },
  { tempId: "m26", categoryTempId: "beverages", name: "Lassi", price: 40, emoji: "🥛", isAvailable: true, isVeg: true },
  { tempId: "m27", categoryTempId: "beverages", name: "Coke", price: 40, emoji: "🥤", isAvailable: true, isVeg: true },
  { tempId: "m28", categoryTempId: "beverages", name: "Fresh Lime", price: 30, emoji: "🍋", isAvailable: true, isVeg: true },
  { tempId: "m29", categoryTempId: "beverages", name: "Mango Shake", price: 60, emoji: "🥭", isAvailable: true, isVeg: true },
  { tempId: "m30", categoryTempId: "snacks", name: "Paneer Tikka", price: 120, emoji: "🍢", isAvailable: true, isVeg: true },
  { tempId: "m31", categoryTempId: "snacks", name: "Pav Bhaji", price: 80, emoji: "🫓", isAvailable: true, isVeg: true },
  { tempId: "m32", categoryTempId: "snacks", name: "French Fries", price: 60, emoji: "🍟", isAvailable: true, isVeg: true },
  { tempId: "m33", categoryTempId: "snacks", name: "Spring Roll", price: 70, emoji: "🥚", isAvailable: true, isVeg: true },
  { tempId: "m34", categoryTempId: "desserts", name: "Gulab Jamun", price: 40, emoji: "🍮", isAvailable: true, isVeg: true },
  { tempId: "m35", categoryTempId: "desserts", name: "Ice Cream", price: 60, emoji: "🍨", isAvailable: true, isVeg: true },
  { tempId: "m36", categoryTempId: "desserts", name: "Kulfi", price: 50, emoji: "🍦", isAvailable: true, isVeg: true },
  { tempId: "m37", categoryTempId: "desserts", name: "Kheer", price: 45, emoji: "🍮", isAvailable: true, isVeg: true },
];

async function main() {
  console.log("Seeding database...");

  // 1. Bootstrap Admin Account
  const adminCount = await prisma.admin.count();
  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const rawPassword = process.env.ADMIN_PASSWORD || "super-secure-change-this-password";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    await prisma.admin.create({
      data: {
        username,
        passwordHash,
      },
    });
    console.log(`Default admin created: ${username}`);
  } else {
    console.log("Admins already exist. Skipping admin bootstrap.");
  }

  // 2. Create Categories
  const categoryCount = await prisma.category.count();
  const categoryMap = new Map<string, string>(); // tempId -> Uuid

  if (categoryCount === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      const dbCat = await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
        },
      });
      categoryMap.set(cat.tempId, dbCat.id);
    }
    console.log("Categories seeded successfully.");
  } else {
    console.log("Categories table is not empty. Loading existing categories for mapping...");
    const existingCats = await prisma.category.findMany();
    for (const cat of existingCats) {
      // Map existing categories by name match or fallback
      const match = DEFAULT_CATEGORIES.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
      if (match) {
        categoryMap.set(match.tempId, cat.id);
      }
    }
  }

  // 3. Create Menu Items
  const menuItemCount = await prisma.menuItem.count();
  if (menuItemCount === 0) {
    for (const item of DEFAULT_MENU) {
      const categoryId = categoryMap.get(item.categoryTempId);
      if (!categoryId) {
        console.warn(`Category UUID not found for ${item.categoryTempId}. Skipping item: ${item.name}`);
        continue;
      }
      await prisma.menuItem.create({
        data: {
          name: item.name,
          price: item.price,
          emoji: item.emoji,
          isAvailable: item.isAvailable,
          isVeg: item.isVeg,
          categoryId: categoryId,
        },
      });
    }
    console.log("Menu items seeded successfully.");
  } else {
    console.log("Menu items table is not empty. Skipping menu item seed.");
  }

  // 4. Create Tables
  const tableCount = await prisma.table.count();
  if (tableCount === 0) {
    for (let id = 1; id <= 12; id++) {
      await prisma.table.create({
        data: {
          id: id,
          name: `T${id}`,
          seats: 4,
          status: TableStatus.empty,
        },
      });
    }
    console.log("Tables seeded successfully.");
  } else {
    console.log("Tables already exist. Skipping table seed.");
  }

  // 5. Create Default Settings
  const settingsCount = await prisma.setting.count();
  if (settingsCount === 0) {
    await prisma.setting.create({
      data: {
        restaurantName: "Hotel Grand",
        address: "123 Grand Street, City Center",
        gstNumber: "27AAAAA1111A1Z1",
        gstPercent: 5.00,
        currency: "INR",
        tableCount: 12,
      },
    });
    console.log("Default settings seeded successfully.");
  } else {
    console.log("Settings already exist. Skipping settings seed.");
  }

  console.log("Seeding process finished!");
}

main()
  .catch((e) => {
    console.error("Error in database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
