import { Router, Request, Response } from "express";
import { PrismaClient, TableStatus } from "@prisma/client";
import { z } from "zod";
import { apiKeyMiddleware } from "../middleware/apiKeyMiddleware";
import { adminAuthMiddleware, AuthenticatedRequest } from "../middleware/adminAuthMiddleware";
import { clientOrAdminAuth } from "../middleware/clientOrAdminAuth";

const prisma = new PrismaClient();
const router = Router();

const updateTableSchema = z.object({
  status: z.nativeEnum(TableStatus).optional(),
  currentOrderId: z.string().uuid().nullable().optional(),
});

const createTableSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  seats: z.number().int().min(1, "Seats must be at least 1"),
});

const adminUpdateTableSchema = z.object({
  name: z.string().min(1).optional(),
  seats: z.number().int().min(1).optional(),
  status: z.nativeEnum(TableStatus).optional(),
});

// Global map to track active timers to prevent duplicates or allow clearing/rescheduling
export const activeTimers = new Map<number, NodeJS.Timeout>();

export async function transitionTableStatus(tableId: number, nextStatus: TableStatus, req?: Request) {
  // Perform everything in a transaction with row-level locking
  const updatedTable = await prisma.$transaction(async (tx) => {
    const lockedTables = await tx.$queryRaw<any[]>`
      SELECT * FROM tables WHERE id = ${tableId} FOR UPDATE
    `;
    if (lockedTables.length === 0) {
      throw new Error("Table not found");
    }
    const table = lockedTables[0];
    const currentStatus = table.status as TableStatus;
    
    if (currentStatus === nextStatus) return table;

    // Validate lifecycle transition
    const ALLOWED_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
      empty: ["active"],
      active: ["bill"],
      bill: ["paid"],
      paid: ["empty"]
    };

    if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new Error(`Invalid table status transition from ${currentStatus} to ${nextStatus}.`);
    }

    // Determine updates
    let currentOrderId = table.currentOrderId;
    if (nextStatus === TableStatus.empty) {
      currentOrderId = null;
    }

    // Perform update
    const updated = await tx.table.update({
      where: { id: tableId },
      data: {
        status: nextStatus,
        currentOrderId,
      },
    });

    // Log transition to audit log
    const authReq = req as AuthenticatedRequest | undefined;
    await tx.auditLog.create({
      data: {
        adminId: authReq?.admin?.id || null,
        action: `Table Status Changed: T${tableId} (${currentStatus} -> ${nextStatus})`,
        entityType: "Table",
        entityId: tableId.toString(),
      },
    });

    return updated;
  });

  // Clear any existing timer for this table if transitioning away from paid manually
  if (activeTimers.has(tableId)) {
    clearTimeout(activeTimers.get(tableId)!);
    activeTimers.delete(tableId);
  }

  // Schedule timer if nextStatus is paid
  if (nextStatus === TableStatus.paid) {
    const timer = setTimeout(async () => {
      try {
        await transitionTableStatus(tableId, TableStatus.empty);
        // Broadcast updates using socket.io if we can find it
        const io = req?.app.get("io") || (global as any).io;
        if (io) {
          io.emit("table-update");
          io.emit("order-update");
        }
      } catch (err) {
        console.error(`Error auto-clearing table ${tableId}:`, err);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    activeTimers.set(tableId, timer);
  }

  return updatedTable;
}

export async function initTableTimers(io?: any) {
  // Store io globally if needed for backup
  (global as any).io = io;
  try {
    const paidTables = await prisma.table.findMany({
      where: { status: TableStatus.paid }
    });

    for (const table of paidTables) {
      const elapsedMs = Date.now() - new Date(table.updatedAt).getTime();
      const gracePeriodMs = 5 * 60 * 1000;

      if (activeTimers.has(table.id)) {
        clearTimeout(activeTimers.get(table.id)!);
      }

      if (elapsedMs >= gracePeriodMs) {
        // Clear immediately
        await transitionTableStatus(table.id, TableStatus.empty);
        console.log(`Auto-cleared table T${table.id} on startup (elapsed ${Math.round(elapsedMs / 1000)}s)`);
      } else {
        const remainingMs = gracePeriodMs - elapsedMs;
        console.log(`Scheduling auto-clear for table T${table.id} in ${Math.round(remainingMs / 1000)}s`);
        
        const timer = setTimeout(async () => {
          try {
            await transitionTableStatus(table.id, TableStatus.empty);
            if (io) {
              io.emit("table-update");
              io.emit("order-update");
            }
          } catch (err) {
            console.error(`Error auto-clearing table ${table.id} from startup timer:`, err);
          }
        }, remainingMs);

        activeTimers.set(table.id, timer);
      }
    }
  } catch (err) {
    console.error("Error initializing table timers on startup:", err);
  }
}

// Helper to broadcast table updates
function broadcastTableUpdate(req: Request) {
  const io = req.app.get("io");
  if (io) {
    io.emit("table-update");
  }
}

/**
 * @openapi
 * /api/tables:
 *   get:
 *     summary: Fetch All Tables (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of tables
 */
router.get("/tables", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { id: "asc" },
    });
    return res.json(tables);
  } catch (error) {
    console.error("Fetch Tables Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/tables/{id}:
 *   patch:
 *     summary: Update Table State (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [empty, active, bill, paid]
 *               currentOrderId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Table updated
 */
router.patch("/tables/:id", clientOrAdminAuth, async (req: Request, res: Response) => {
  const tableId = parseInt(req.params.id, 10);
  if (isNaN(tableId)) {
    return res.status(400).json({ error: "Invalid table ID" });
  }

  try {
    const body = updateTableSchema.parse(req.body);
    if (body.status) {
      const table = await transitionTableStatus(tableId, body.status, req);
      broadcastTableUpdate(req);
      return res.json(table);
    }

    const originalTable = await prisma.table.findUnique({ where: { id: tableId } });
    if (!originalTable) {
      return res.status(404).json({ error: "Table not found" });
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(body.currentOrderId !== undefined && { currentOrderId: body.currentOrderId }),
      },
    });

    if (body.currentOrderId !== undefined && body.currentOrderId !== originalTable.currentOrderId) {
      const authReq = req as AuthenticatedRequest | undefined;
      await prisma.auditLog.create({
        data: {
          adminId: authReq?.admin?.id || null,
          action: `Table Order ID Updated: T${tableId} (${originalTable.currentOrderId || "None"} -> ${body.currentOrderId || "None"})`,
          entityType: "Table",
          entityId: tableId.toString(),
        },
      });
    }

    broadcastTableUpdate(req);
    return res.json(table);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update Table Error:", error);
    return res.status(400).json({ error: error.message || "Invalid transition" });
  }
});

/**
 * @openapi
 * /api/admin/tables:
 *   post:
 *     summary: Create Physical Dining Table (Admin)
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
 *               - seats
 *             properties:
 *               name:
 *                 type: string
 *               seats:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Table created
 */
router.post("/admin/tables", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const body = createTableSchema.parse(req.body);
    const table = await prisma.table.create({
      data: {
        name: body.name,
        seats: body.seats,
        status: TableStatus.empty,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: authReq.admin?.id,
        action: "Table Added",
        entityType: "Table",
        entityId: table.id.toString(),
      },
    });

    broadcastTableUpdate(req);
    return res.status(201).json(table);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Create Table Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/tables/{id}:
 *   put:
 *     summary: Update Table Configuration (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               seats:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [empty, active, bill, paid]
 *     responses:
 *       200:
 *         description: Table updated
 */
router.put("/admin/tables/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const tableId = parseInt(req.params.id, 10);
  if (isNaN(tableId)) {
    return res.status(400).json({ error: "Invalid table ID" });
  }

  try {
    const body = adminUpdateTableSchema.parse(req.body);
    const originalTable = await prisma.table.findUnique({ where: { id: tableId } });
    if (!originalTable) {
      return res.status(404).json({ error: "Table not found" });
    }

    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.seats !== undefined && { seats: body.seats }),
        ...(body.status !== undefined && { status: body.status }),
      },
    });

    let changeDetails = [];
    if (body.name && body.name !== originalTable.name) changeDetails.push(`Name: ${originalTable.name} -> ${body.name}`);
    if (body.seats && body.seats !== originalTable.seats) changeDetails.push(`Seats: ${originalTable.seats} -> ${body.seats}`);
    if (body.status && body.status !== originalTable.status) changeDetails.push(`Status: ${originalTable.status} -> ${body.status}`);

    if (changeDetails.length > 0) {
      await prisma.auditLog.create({
        data: {
          adminId: authReq.admin?.id,
          action: `Table Updated: ${changeDetails.join(", ")}`,
          entityType: "Table",
          entityId: table.id.toString(),
        },
      });
    }

    broadcastTableUpdate(req);
    return res.json(table);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update Admin Table Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/admin/tables/{id}:
 *   delete:
 *     summary: Remove Physical Table (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Table deleted successfully
 */
router.delete("/admin/tables/:id", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const tableId = parseInt(req.params.id, 10);
  if (isNaN(tableId)) {
    return res.status(400).json({ error: "Invalid table ID" });
  }

  try {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return res.status(404).json({ error: "Table not found" });
    }

    await prisma.table.delete({ where: { id: tableId } });

    await prisma.auditLog.create({
      data: {
        adminId: authReq.admin?.id,
        action: "Table Deleted",
        entityType: "Table",
        entityId: tableId.toString(),
      },
    });

    broadcastTableUpdate(req);
    return res.json({ message: "Table deleted successfully" });
  } catch (error) {
    console.error("Delete Table Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
