import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { clientOrAdminAuth } from "../middleware/clientOrAdminAuth";
import { adminAuthMiddleware, AuthenticatedRequest } from "../middleware/adminAuthMiddleware";

const prisma = new PrismaClient();
const router = Router();

// Zod validation schemas
const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1, "Icon is required"),
  sortOrder: z.number().int().default(0),
});

const menuItemSchema = z.object({
  categoryId: z.string().uuid("Invalid category ID"),
  name: z.string().min(1, "Name is required"),
  price: z.number().positive("Price must be a positive number"),
  emoji: z.string().optional().nullable(),
  isAvailable: z.boolean().default(true),
  isVeg: z.boolean().default(true),
});

const updateMenuItemSchema = menuItemSchema.partial();

// Helper to broadcast menu updates
function broadcastMenuUpdate(req: Request) {
  const io = req.app.get("io");
  if (io) {
    io.emit("menu-update");
  }
}

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Fetch Active Categories (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/categories", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isDeleted: false },
      orderBy: { sortOrder: "asc" },
    });
    return res.json(categories);
  } catch (error) {
    console.error("Fetch Categories Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/menu:
 *   get:
 *     summary: Fetch Active Menu Items (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of menu items
 */
router.get("/menu", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      where: {
        isDeleted: false,
        category: { isDeleted: false },
      },
      orderBy: { name: "asc" },
    });
    return res.json(menuItems);
  } catch (error) {
    console.error("Fetch Menu Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================================
   ADMIN CATEGORIES ENDPOINTS
   ========================================== */

/**
 * @openapi
 * /api/admin/categories:
 *   post:
 *     summary: Create Menu Category (Admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - icon
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Category created
 */
router.post("/admin/categories", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const body = categorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: body,
    });

    await prisma.auditLog.create({
      data: {
        adminId: authReq.admin?.id,
        action: "Category Added",
        entityType: "Category",
        entityId: category.id,
      },
    });

    broadcastMenuUpdate(req);
    return res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Create Category Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update Menu Category (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               icon:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Category updated
 */
router.put("/admin/categories/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const body = categorySchema.parse(req.body);
    const originalCategory = await prisma.category.findFirst({
      where: { id, isDeleted: false },
    });

    if (!originalCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    const category = await prisma.category.update({
      where: { id },
      data: body,
    });

    let details = [];
    if (body.name !== originalCategory.name) details.push(`Name: ${originalCategory.name} -> ${body.name}`);
    if (body.icon !== originalCategory.icon) details.push(`Icon: ${originalCategory.icon} -> ${body.icon}`);
    if (body.sortOrder !== originalCategory.sortOrder) details.push(`Sort: ${originalCategory.sortOrder} -> ${body.sortOrder}`);

    if (details.length > 0) {
      await prisma.auditLog.create({
        data: {
          adminId: authReq.admin?.id,
          action: `Category Updated: ${details.join(", ")}`,
          entityType: "Category",
          entityId: id,
        },
      });
    }

    broadcastMenuUpdate(req);
    return res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update Category Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Soft Delete Category (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category soft deleted
 */
router.delete("/api/admin/categories/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const category = await prisma.category.findFirst({
      where: { id, isDeleted: false },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Soft delete Category and cascadingly soft delete all contained MenuItems inside transaction
    await prisma.$transaction([
      prisma.category.update({
        where: { id },
        data: { isDeleted: true },
      }),
      prisma.menuItem.updateMany({
        where: { categoryId: id },
        data: { isDeleted: true },
      }),
      prisma.auditLog.create({
        data: {
          adminId: authReq.admin?.id,
          action: "Category Soft-Deleted (and cascades to its menu items)",
          entityType: "Category",
          entityId: id,
        },
      }),
    ]);

    broadcastMenuUpdate(req);
    return res.json({ message: "Category and its menu items soft-deleted successfully" });
  } catch (error) {
    console.error("Delete Category Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/* ==========================================
   ADMIN MENU ITEMS ENDPOINTS
   ========================================== */

/**
 * @openapi
 * /api/admin/menu:
 *   post:
 *     summary: Create Menu Item (Admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoryId
 *               - name
 *               - price
 *             properties:
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               emoji:
 *                 type: string
 *               isAvailable:
 *                 type: boolean
 *               isVeg:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: MenuItem created
 */
router.post("/admin/menu", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const body = menuItemSchema.parse(req.body);
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, isDeleted: false },
    });

    if (!category) {
      return res.status(400).json({ error: "Active Category not found with provided ID" });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        categoryId: body.categoryId,
        name: body.name,
        price: body.price,
        emoji: body.emoji,
        isAvailable: body.isAvailable,
        isVeg: body.isVeg,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: authReq.admin?.id,
        action: "Menu Item Added",
        entityType: "MenuItem",
        entityId: menuItem.id,
      },
    });

    broadcastMenuUpdate(req);
    return res.status(201).json(menuItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Create Menu Item Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/menu/{id}:
 *   put:
 *     summary: Update Menu Item (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               emoji:
 *                 type: string
 *               isAvailable:
 *                 type: boolean
 *               isVeg:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: MenuItem updated
 */
router.put("/admin/menu/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const body = updateMenuItemSchema.parse(req.body);
    const originalItem = await prisma.menuItem.findFirst({
      where: { id, isDeleted: false },
    });

    if (!originalItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, isDeleted: false },
      });
      if (!category) {
        return res.status(400).json({ error: "Active Category not found with provided ID" });
      }
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: body,
    });

    let details = [];
    if (body.name && body.name !== originalItem.name) details.push(`Name: ${originalItem.name} -> ${body.name}`);
    if (body.price && Number(body.price) !== Number(originalItem.price)) details.push(`Price: ${originalItem.price} -> ${body.price}`);
    if (body.isAvailable !== undefined && body.isAvailable !== originalItem.isAvailable) details.push(`Available: ${originalItem.isAvailable} -> ${body.isAvailable}`);
    if (body.isVeg !== undefined && body.isVeg !== originalItem.isVeg) details.push(`Veg: ${originalItem.isVeg} -> ${body.isVeg}`);

    if (details.length > 0) {
      await prisma.auditLog.create({
        data: {
          adminId: authReq.admin?.id,
          action: `Menu Item Updated: ${details.join(", ")}`,
          entityType: "MenuItem",
          entityId: id,
        },
      });
    }

    broadcastMenuUpdate(req);
    return res.json(menuItem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update Menu Item Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/menu/{id}:
 *   delete:
 *     summary: Soft Delete Menu Item (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: MenuItem soft deleted
 */
router.delete("/api/admin/menu/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = req.params;

  try {
    const item = await prisma.menuItem.findFirst({
      where: { id, isDeleted: false },
    });

    if (!item) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    await prisma.$transaction([
      prisma.menuItem.update({
        where: { id },
        data: { isDeleted: true },
      }),
      prisma.auditLog.create({
        data: {
          adminId: authReq.admin?.id,
          action: "Menu Item Soft-Deleted",
          entityType: "MenuItem",
          entityId: id,
        },
      }),
    ]);

    broadcastMenuUpdate(req);
    return res.json({ message: "Menu item soft-deleted successfully" });
  } catch (error) {
    console.error("Delete Menu Item Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
