import { Router, Request, Response } from "express";
import { PrismaClient, PaymentMethod, OrderStatus } from "@prisma/client";
import { z } from "zod";
import { adminAuthMiddleware, AuthenticatedRequest } from "../middleware/adminAuthMiddleware";
import { apiKeyMiddleware } from "../middleware/apiKeyMiddleware";
import { clientOrAdminAuth } from "../middleware/clientOrAdminAuth";

const prisma = new PrismaClient();
const router = Router();

// Zod schemas
const updateSettingsSchema = z.object({
  restaurantName: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  gstNumber: z.string().min(1).optional(),
  gstPercent: z.number().min(0).max(100).optional(),
  currency: z.string().min(1).optional(),
  tableCount: z.number().int().min(1).optional(),
});

/**
 * @openapi
 * /api/settings:
 *   get:
 *     summary: Get Restaurant Settings (Mobile & Admin)
 *     responses:
 *       200:
 *         description: Current configurations
 */
router.get("/settings", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findFirst();
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    return res.json(settings);
  } catch (error) {
    console.error("Get Settings Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/settings:
 *   put:
 *     summary: Update Restaurant Settings (Admin Only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               restaurantName:
 *                 type: string
 *               address:
 *                 type: string
 *               gstNumber:
 *                 type: string
 *               gstPercent:
 *                 type: number
 *               currency:
 *                 type: string
 *               tableCount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.put("/admin/settings", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const body = updateSettingsSchema.parse(req.body);
    const settings = await prisma.setting.findFirst();
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }

    const updated = await prisma.setting.update({
      where: { id: settings.id },
      data: {
        ...(body.restaurantName !== undefined && { restaurantName: body.restaurantName }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.gstNumber !== undefined && { gstNumber: body.gstNumber }),
        ...(body.gstPercent !== undefined && { gstPercent: body.gstPercent }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.tableCount !== undefined && { tableCount: body.tableCount }),
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: authReq.admin?.id,
        action: `Restaurant Settings Updated: ${Object.keys(body).join(", ")}`,
        entityType: "Settings",
        entityId: settings.id.toString(),
      },
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update Settings Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/reports/sales-pulse:
 *   get:
 *     summary: Live Dashboard Sales Pulse (Admin Only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current operational sales stats
 */
router.get("/admin/reports/sales-pulse", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openOrdersCount = await prisma.order.count({
      where: {
        status: { in: [OrderStatus.open, OrderStatus.hold, OrderStatus.billed] },
      },
    });

    const paidOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.paid,
        closedAt: { gte: today },
      },
    });

    const todaySales = paidOrders.reduce((sum, ord) => sum + Number(ord.total), 0);
    const paidBillsCount = paidOrders.length;
    
    // Average ticket size of closed orders
    const averageTicket = paidBillsCount > 0 ? todaySales / paidBillsCount : 0;

    return res.json({
      activeOrders: openOrdersCount,
      paidBills: paidBillsCount,
      todaySales,
      averageTicket,
    });
  } catch (error) {
    console.error("Sales Pulse Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/reports/sales-trends:
 *   get:
 *     summary: Weekly/Monthly Sales Trends (Admin Only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Graphs and aggregated weekly/monthly statistics
 */
router.get("/admin/reports/sales-trends", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    // 1. Weekly Sales (Last 7 Days)
    const weeklySales = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const dayInvoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      });

      const total = dayInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      weeklySales.push({
        label: days[start.getDay()],
        value: total,
      });
    }

    // 2. Monthly Sales (Last 6 Months)
    const monthlySales = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const monthInvoices = await prisma.invoice.findMany({
        where: {
          createdAt: {
            gte: start,
            lt: end,
          },
        },
      });

      const total = monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthlySales.push({
        label: months[start.getMonth()],
        value: total,
      });
    }

    return res.json({
      weekly: weeklySales,
      monthly: monthlySales,
    });
  } catch (error) {
    console.error("Sales Trends Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/reports/daily-close:
 *   get:
 *     summary: Get Daily Closing Financial Report (Admin Only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated summaries of cash, UPI, card, and credit payments
 */
router.get("/admin/reports/daily-close", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await prisma.invoice.findMany({
      where: {
        createdAt: { gte: today },
      },
    });

    const breakdown = {
      cash: 0,
      upi: 0,
      card: 0,
      credit: 0,
    };

    let totalSales = 0;
    invoices.forEach((inv) => {
      const amount = Number(inv.total);
      totalSales += amount;
      if (inv.paymentMethod === PaymentMethod.cash) breakdown.cash += amount;
      else if (inv.paymentMethod === PaymentMethod.upi) breakdown.upi += amount;
      else if (inv.paymentMethod === PaymentMethod.card) breakdown.card += amount;
      else if (inv.paymentMethod === PaymentMethod.credit) breakdown.credit += amount;
    });

    return res.json({
      sales: totalSales,
      breakdown,
      orderCount: invoices.length,
    });
  } catch (error) {
    console.error("Daily Close Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/reports/audit-logs:
 *   get:
 *     summary: Fetch Administration Logs (Admin Only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of audit records
 */
router.get("/api/admin/reports/audit-logs", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        admin: {
          select: { username: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return res.json(logs);
  } catch (error) {
    console.error("Fetch Audit Logs Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/invoices:
 *   get:
 *     summary: Fetch Historical Invoices (Admin Only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoice logs
 */
router.get("/api/admin/invoices", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json(invoices);
  } catch (error) {
    console.error("Fetch Invoices Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
