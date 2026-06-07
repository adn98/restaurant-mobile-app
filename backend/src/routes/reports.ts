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

    let tableCountChanged = false;
    const updated = await prisma.$transaction(async (tx) => {
      // Lock settings row to prevent race conditions with concurrent setting updates
      const lockedSettings = await tx.$queryRaw<any[]>`
        SELECT * FROM settings WHERE id = ${settings.id} FOR UPDATE
      `;
      if (lockedSettings.length === 0) {
        throw new Error("Settings not found");
      }
      const currentSettings = lockedSettings[0];
      const currentTableCount = currentSettings.table_count;

      // 1. Update setting
      const settingUpdate = await tx.setting.update({
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

      // 2. Adjust physical tables if needed comparing with actual database value inside lock
      if (body.tableCount !== undefined && body.tableCount !== currentTableCount) {
        tableCountChanged = true;
        const newTableCount = body.tableCount;
        const currentTables = await tx.table.findMany({
          orderBy: { id: "asc" },
        });
        const currentCount = currentTables.length;

        if (newTableCount > currentCount) {
          const diff = newTableCount - currentCount;
          let maxNum = 0;
          for (const t of currentTables) {
            const match = t.name.match(/^T(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
          if (maxNum === 0) maxNum = currentCount;

          for (let i = 1; i <= diff; i++) {
            const tableNum = maxNum + i;
            const newTable = await tx.table.create({
              data: {
                name: `T${tableNum}`,
                seats: 4,
                status: "empty",
              },
            });

            await tx.auditLog.create({
              data: {
                adminId: authReq.admin?.id,
                action: `Table ${newTable.name} Created (Settings Adjustment)`,
                entityType: "Table",
                entityId: newTable.id.toString(),
              },
            });
          }
        } else if (newTableCount < currentCount) {
          const tablesToDelete = currentTables.slice(newTableCount);
          const tableIds = tablesToDelete.map((t) => t.id);

          // Lock the tables we are about to delete using safe parameterized SQL
          await tx.$queryRaw`
            SELECT * FROM tables WHERE id = ANY(${tableIds}) FOR UPDATE
          `;

          // Re-read locked tables to get the absolute latest status post-lock acquisition
          const lockedTables = await tx.table.findMany({
            where: { id: { in: tableIds } },
            orderBy: { id: "asc" },
          });

          // Check occupied tables inside the lock to prevent race conditions
          const activeTables = lockedTables.filter(
            (t) => t.status !== "empty" || t.currentOrderId !== null
          );
          if (activeTables.length > 0) {
            throw new Error(
              `Cannot reduce table count because the following tables are occupied: ${activeTables
                .map((t) => t.name)
                .join(", ")}. Please clear them first.`
            );
          }

          for (const t of tablesToDelete) {
            await tx.table.delete({
              where: { id: t.id },
            });

            await tx.auditLog.create({
              data: {
                adminId: authReq.admin?.id,
                action: `Table ${t.name} Deleted (Settings Adjustment)`,
                entityType: "Table",
                entityId: t.id.toString(),
              },
            });
          }
        }
      }

      // 3. Log settings update
      await tx.auditLog.create({
        data: {
          adminId: authReq.admin?.id,
          action: `Restaurant Settings Updated: ${Object.keys(body).join(", ")}`,
          entityType: "Settings",
          entityId: settings.id.toString(),
        },
      });

      return settingUpdate;
    });

    // 4. Broadcast updates via Socket.IO
    if (tableCountChanged) {
      const io = req.app.get("io");
      if (io) {
        io.emit("table-update");
      }
    }

    return res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof Error && error.message.includes("Cannot reduce table count")) {
      return res.status(400).json({ error: error.message });
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

    const totalSalesQuery = await prisma.invoice.aggregate({
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
      where: {
        createdAt: { gte: today },
      },
    });

    const breakdownQuery = await prisma.invoice.groupBy({
      by: ["paymentMethod"],
      _sum: {
        total: true,
      },
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

    breakdownQuery.forEach((group) => {
      const method = group.paymentMethod.toLowerCase() as keyof typeof breakdown;
      if (method in breakdown) {
        breakdown[method] = Number(group._sum.total || 0);
      }
    });

    return res.json({
      sales: Number(totalSalesQuery._sum.total || 0),
      breakdown,
      orderCount: totalSalesQuery._count.id,
    });
  } catch (error) {
    console.error("Daily Close Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/reports/analytics:
 *   get:
 *     summary: Aggregated Restaurant Operations Analytics (Admin Only)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Consolidated operational metrics
 */
router.get("/admin/reports/analytics", adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Revenue Today
    const revenueTodayQuery = await prisma.invoice.aggregate({
      _sum: {
        total: true,
      },
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
    });
    const revenueToday = Number(revenueTodayQuery._sum.total || 0);

    // 2. Average Ticket Size (Today's Invoices)
    const avgTicketQuery = await prisma.invoice.aggregate({
      _avg: {
        total: true,
      },
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
    });
    const averageTicket = Number(avgTicketQuery._avg.total || 0);

    // 3. Orders Today
    const ordersToday = await prisma.order.count({
      where: {
        openedAt: {
          gte: startOfDay,
        },
      },
    });

    // 4. Payment Method Distribution
    const paymentDistribution = await prisma.invoice.groupBy({
      by: ["paymentMethod"],
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
      where: {
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    const totalTodaySales = paymentDistribution.reduce((sum, item) => sum + Number(item._sum.total || 0), 0);

    const formattedDistribution = {
      cash: { count: 0, amount: 0, percentage: 0 },
      upi: { count: 0, amount: 0, percentage: 0 },
      card: { count: 0, amount: 0, percentage: 0 },
      credit: { count: 0, amount: 0, percentage: 0 },
    };

    paymentDistribution.forEach(item => {
      const method = item.paymentMethod.toLowerCase() as keyof typeof formattedDistribution;
      if (method in formattedDistribution) {
        const amount = Number(item._sum.total || 0);
        const count = item._count.id;
        const percentage = totalTodaySales > 0 ? (amount / totalTodaySales) * 100 : 0;
        formattedDistribution[method] = { count, amount, percentage };
      }
    });

    // 5. Top Selling Items
    const topSellingQuery = await prisma.invoiceItem.groupBy({
      by: ["name"],
      _sum: {
        qty: true,
      },
      where: {
        invoice: {
          createdAt: {
            gte: startOfDay,
          },
        },
      },
      orderBy: {
        _sum: {
          qty: "desc",
        },
      },
      take: 5,
    });

    const topSellingItems = topSellingQuery.map(item => ({
      name: item.name,
      qty: item._sum.qty || 0,
    }));

    // 6. Order Velocity
    const todayOrders = await prisma.order.findMany({
      where: {
        openedAt: {
          gte: startOfDay,
        },
      },
      select: {
        openedAt: true,
      },
    });

    const hourlyCounts = Array(24).fill(0);
    todayOrders.forEach(o => {
      const hour = new Date(o.openedAt).getHours();
      if (hour >= 0 && hour < 24) {
        hourlyCounts[hour]++;
      }
    });

    const totalTodayOrders = todayOrders.length;
    const currentHour = new Date().getHours() + 1;
    const averagePerHour = Number((totalTodayOrders / currentHour).toFixed(1));

    const velocity = {
      hourlyCounts,
      averagePerHour,
      totalTodayOrders,
    };

    // 7. Active Tables
    const activeTables = await prisma.table.count({
      where: {
        status: "active",
      },
    });

    // 8. Occupied Tables
    const occupiedTables = await prisma.table.count({
      where: {
        status: {
          not: "empty",
        },
      },
    });

    // 9. Average Guests Per Order
    const avgGuestsQuery = await prisma.order.aggregate({
      _avg: {
        guests: true,
      },
    });
    const averageGuests = Number(avgGuestsQuery._avg.guests || 0);

    // 10. Most Popular Category (Two-stage aggregation with startOfDay filter)
    const itemSales = await prisma.invoiceItem.groupBy({
      by: ["menuItemId"],
      _sum: {
        qty: true,
      },
      where: {
        menuItemId: { not: null },
        invoice: {
          createdAt: {
            gte: startOfDay,
          },
        },
      },
    });

    const itemsWithCategories = await prisma.menuItem.findMany({
      select: {
        id: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const categorySales: Record<string, number> = {};
    const itemIdToCategoryName = new Map(itemsWithCategories.map(item => [item.id, item.category.name]));

    itemSales.forEach(sale => {
      if (sale.menuItemId) {
        const catName = itemIdToCategoryName.get(sale.menuItemId);
        if (catName) {
          categorySales[catName] = (categorySales[catName] || 0) + Number(sale._sum.qty || 0);
        }
      }
    });

    let mostPopularCategory = "N/A";
    let maxSalesVolume = 0;
    Object.entries(categorySales).forEach(([catName, volume]) => {
      if (volume > maxSalesVolume) {
        maxSalesVolume = volume;
        mostPopularCategory = catName;
      }
    });

    return res.json({
      revenueToday,
      averageTicket,
      ordersToday,
      paymentDistribution: formattedDistribution,
      topSellingItems,
      velocity,
      activeTables,
      occupiedTables,
      averageGuests,
      mostPopularCategory,
    });
  } catch (error) {
    console.error("Fetch Analytics Error:", error);
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
router.get("/admin/reports/audit-logs", adminAuthMiddleware, async (req: Request, res: Response) => {
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
router.get("/admin/invoices", adminAuthMiddleware, async (req: Request, res: Response) => {
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
