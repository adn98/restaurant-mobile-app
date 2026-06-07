import { Router, Request, Response } from "express";
import { PrismaClient, OrderStatus, TableStatus, PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { clientOrAdminAuth } from "../middleware/clientOrAdminAuth";
import { transitionTableStatus } from "./tables";

const prisma = new PrismaClient();
const router = Router();

// Zod validations
const createOrderSchema = z.object({
  tableId: z.number().int().positive(),
  guests: z.number().int().positive().default(1),
});

const syncItemSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string(),
  price: z.number().positive(),
  qty: z.number().int().nonnegative(),
  notes: z.string().optional().nullable(),
});

const syncOrderItemsSchema = z.object({
  items: z.array(syncItemSchema),
});

const payOrderSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
});

// Real-time broadcast helpers
function emitTableUpdate(req: Request) {
  const io = req.app.get("io");
  if (io) io.emit("table-update");
}

function emitOrderUpdate(req: Request) {
  const io = req.app.get("io");
  if (io) io.emit("order-update");
}

/**
 * @openapi
 * /api/orders:
 *   get:
 *     summary: Fetch Orders (Mobile & Admin)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [open, hold, billed, paid]
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get("/orders", clientOrAdminAuth, async (req: Request, res: Response) => {
  const status = req.query.status as OrderStatus | undefined;
  try {
    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      include: { items: true },
      orderBy: { openedAt: "desc" },
    });
    return res.json(orders);
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     summary: Fetch Single Order Detail
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get("/orders/:id", clientOrAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json(order);
  } catch (error) {
    console.error("Fetch Order Details Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Open New Order (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *             properties:
 *               tableId:
 *                 type: integer
 *               guests:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Order opened successfully
 */
router.post("/orders", clientOrAdminAuth, async (req: Request, res: Response) => {
  try {
    const body = createOrderSchema.parse(req.body);

    // Create Order and Update Table status inside Transaction with Row Locking
    const order = await prisma.$transaction(async (tx) => {
      // 1. Lock and retrieve the target table record
      const lockedTables = await tx.$queryRaw<any[]>`
        SELECT * FROM tables WHERE id = ${body.tableId} FOR UPDATE
      `;

      if (lockedTables.length === 0) {
        throw new Error("Table not found");
      }

      const table = lockedTables[0];
      if (table.status !== "empty") {
        throw new Error("Table is not empty. Cannot open a new order.");
      }

      // Generate unique order number using atomic database sequence
      const seqResult = await tx.$queryRaw<any[]>`
        SELECT nextval('order_no_seq')::text as seq
      `;
      const orderNo = `#${seqResult[0].seq}`;

      const ord = await tx.order.create({
        data: {
          tableId: body.tableId,
          orderNo,
          guests: body.guests,
          status: OrderStatus.open,
          subtotal: 0.0,
          gstAmount: 0.0,
          total: 0.0,
        },
      });

      await tx.table.update({
        where: { id: body.tableId },
        data: {
          status: TableStatus.active,
          currentOrderId: ord.id,
        },
      });

      // Write audit log for order creation
      await tx.auditLog.create({
        data: {
          action: `Order ${orderNo} Opened for Table T${body.tableId} (${body.guests} guests)`,
          entityType: "Order",
          entityId: ord.id,
        },
      });

      return ord;
    });

    emitTableUpdate(req);
    emitOrderUpdate(req);

    return res.status(201).json(order);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof Error && (error.message === "Table not found" || error.message.includes("is not empty"))) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Open Order Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/orders/{id}/items:
 *   put:
 *     summary: Sync Order Items List (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
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
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - menuItemId
 *                     - name
 *                     - price
 *                     - qty
 *                   properties:
 *                     menuItemId:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     qty:
 *                       type: integer
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Items synced and totals calculated
 *       400:
 *         description: Order is not in 'open' or 'hold' status
 */
router.put("/orders/:id/items", clientOrAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const body = syncOrderItemsSchema.parse(req.body);
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== OrderStatus.open && order.status !== OrderStatus.hold) {
      return res.status(400).json({ error: "Order is already billed or paid. Items cannot be modified." });
    }

    // Retrieve settings to check GST percentage
    const settings = await prisma.setting.findFirst();
    const gstPercent = settings ? Number(settings.gstPercent) : 5.0;

    // Recalculate Totals
    let subtotal = 0;
    const itemsToCreate = body.items
      .filter((item) => item.qty > 0)
      .map((item) => {
        const itemSubtotal = item.price * item.qty;
        subtotal += itemSubtotal;
        return {
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          qty: item.qty,
          notes: item.notes,
        };
      });

    const gstAmount = (subtotal * gstPercent) / 100;
    const total = subtotal + gstAmount;

    // Replace order items inside Transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Delete existing order items
      await tx.orderItem.deleteMany({
        where: { orderId: id },
      });

      // Write new order items
      if (itemsToCreate.length > 0) {
        await tx.orderItem.createMany({
          data: itemsToCreate.map((it) => ({
            ...it,
            orderId: id,
          })),
        });
      }

      // Update Order totals
      return await tx.order.update({
        where: { id },
        data: {
          subtotal,
          gstAmount,
          total,
        },
        include: { items: true },
      });
    });

    emitOrderUpdate(req);
    return res.json(updatedOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Sync Order Items Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/orders/{id}/bill:
 *   post:
 *     summary: Generate Bill (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bill generated, status changed to 'billed'
 */
router.post("/orders/:id/bill", clientOrAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === OrderStatus.paid) {
      return res.status(400).json({ error: "Order is already paid" });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.billed },
      });

      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.bill },
        });
      }

      // Write audit log for generating bill
      await tx.auditLog.create({
        data: {
          action: `Bill Prepared for Order ${order.orderNo} (Table T${order.tableId})`,
          entityType: "Order",
          entityId: ord.id,
        },
      });

      return ord;
    });

    emitTableUpdate(req);
    emitOrderUpdate(req);

    return res.json(updatedOrder);
  } catch (error) {
    console.error("Generate Bill Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/orders/{id}/pay:
 *   post:
 *     summary: Close Order & Pay (Mobile Client)
 *     security:
 *       - ApiKeyAuth: []
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
 *             required:
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, upi, card, credit]
 *     responses:
 *       200:
 *         description: Order paid, invoice generated
 */
router.post("/orders/:id/pay", clientOrAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const body = payOrderSchema.parse(req.body);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === OrderStatus.paid) {
      return res.status(400).json({ error: "Order has already been paid and closed." });
    }

    // Atomic Checkout Database Transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Generate Unique Invoice Number (e.g. INV-2026-000001)
      const count = await tx.invoice.count();
      const year = new Date().getFullYear();
      const invoiceNo = `INV-${year}-${String(count + 1).padStart(6, "0")}`;

      // 2. Create Invoice
      const inv = await tx.invoice.create({
        data: {
          orderId: order.id,
          tableId: order.tableId ?? 0,
          orderNo: order.orderNo,
          invoiceNo,
          subtotal: order.subtotal,
          gstAmount: order.gstAmount,
          total: order.total,
          paymentMethod: body.paymentMethod,
        },
      });

      // 3. Create Invoice Items
      const invoiceItems = order.items.map((item) => ({
        invoiceId: inv.id,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        qty: item.qty,
      }));

      if (invoiceItems.length > 0) {
        await tx.invoiceItem.createMany({
          data: invoiceItems,
        });
      }

      // 4. Update Order Status
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.paid,
          closedAt: new Date(),
          paymentMethod: body.paymentMethod,
        },
      });

      // 5. Ensure Table Status remains bill during transaction
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: {
            status: TableStatus.bill,
          },
        });
      }

      // 6. Write Audit Log
      await tx.auditLog.create({
        data: {
          action: `Order ${order.orderNo} Closed - Invoice Generated: ${invoiceNo} (Paid via ${body.paymentMethod.toUpperCase()})`,
          entityType: "Invoice",
          entityId: inv.id,
        },
      });

      return inv;
    });

    // If UPI/Card payment, transition table to paid (starts 5-minute grace period)
    if (order.tableId && (body.paymentMethod === PaymentMethod.upi || body.paymentMethod === PaymentMethod.card)) {
      await transitionTableStatus(order.tableId, TableStatus.paid, req);
    }

    emitTableUpdate(req);
    emitOrderUpdate(req);

    // Notify dashboard of sales changes
    const io = req.app.get("io");
    if (io) io.emit("sales-update");

    // Fetch complete invoice with items for client return
    const completeInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true },
    });

    return res.json(completeInvoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Order Payment Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     summary: Fetch All Invoices (Mobile & Admin)
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of invoices
 */
router.get("/invoices", clientOrAdminAuth, async (req: Request, res: Response) => {
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

/**
 * @openapi
 * /api/invoices/{orderId}:
 *   get:
 *     summary: Fetch Invoice Detail by Order ID or Invoice ID (Mobile & Admin)
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invoice details
 *       404:
 *         description: Invoice not found
 */
router.get("/invoices/:orderId", clientOrAdminAuth, async (req: Request, res: Response) => {
  const { orderId } = req.params;
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { orderId },
          { id: orderId }
        ]
      },
      include: { items: true },
    });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    return res.json(invoice);
  } catch (error) {
    console.error("Fetch Invoice Detail Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
