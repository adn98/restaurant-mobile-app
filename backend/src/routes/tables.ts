import { Router, Request, Response } from "express";
import { PrismaClient, TableStatus } from "@prisma/client";
import { z } from "zod";
import { apiKeyMiddleware } from "../middleware/apiKeyMiddleware";
import { adminAuthMiddleware, AuthenticatedRequest } from "../middleware/adminAuthMiddleware";

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
router.get("/tables", apiKeyMiddleware, async (req: Request, res: Response) => {
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
router.patch("/tables/:id", apiKeyMiddleware, async (req: Request, res: Response) => {
  const tableId = parseInt(req.params.id, 10);
  if (isNaN(tableId)) {
    return res.status(400).json({ error: "Invalid table ID" });
  }

  try {
    const body = updateTableSchema.parse(req.body);
    const table = await prisma.table.update({
      where: { id: tableId },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.currentOrderId !== undefined && { currentOrderId: body.currentOrderId }),
      },
    });

    broadcastTableUpdate(req);
    return res.json(table);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update Table Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
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
