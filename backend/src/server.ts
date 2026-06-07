import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

import authRouter from "./routes/auth";
import tablesRouter, { initTableTimers } from "./routes/tables";
import menuRouter from "./routes/menu";
import ordersRouter from "./routes/orders";
import reportsRouter from "./routes/reports";
import { setupSwagger } from "./swagger";

const prisma = new PrismaClient();
const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

app.set("io", io);
initTableTimers(io);

// Global Middleware
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://localhost:8081",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate Limiting for mobile client/public endpoints
const clientRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});

app.use("/api/tables", clientRateLimiter);
app.use("/api/orders", clientRateLimiter);
app.use("/api/menu", clientRateLimiter);
app.use("/api/categories", clientRateLimiter);

// Health check endpoint
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Verify service health status
 *     responses:
 *       200:
 *         description: Server is online and database is reachable
 */
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Health Check Database Error:", error);
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      message: (error as Error).message,
    });
  }
});

// Setup Swagger Documentation
setupSwagger(app);

// Bind Routers
app.use("/api/auth", authRouter);
app.use("/api", tablesRouter);
app.use("/api", menuRouter);
app.use("/api", ordersRouter);
app.use("/api", reportsRouter);

// Socket.IO event handler
io.on("connection", (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Admin Account Bootstrap
async function bootstrapAdmin() {
  try {
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
      console.log(`Admin account bootstrapped: ${username}`);
    }

    // Ensure order number sequence is initialized safely based on max existing order number
    const maxValResult = await prisma.$queryRaw<any[]>`
      SELECT MAX(NULLIF(regexp_replace(order_no, '[^0-9]', '', 'g'), '')::integer) as max_val FROM orders
    `;
    const maxVal = maxValResult[0]?.max_val;
    const startVal = maxVal ? Math.max(1026, maxVal + 1) : 1026;

    await prisma.$executeRawUnsafe(`
      CREATE SEQUENCE IF NOT EXISTS order_no_seq START WITH ${startVal};
    `);

    // Align sequence value to startVal - 1 (or current last value if higher) to handle database restores or manual entries
    await prisma.$executeRawUnsafe(`
      SELECT setval('order_no_seq', GREATEST(COALESCE((SELECT last_value FROM pg_sequences WHERE sequencename = 'order_no_seq'), 1), ${startVal - 1}), true);
    `);
    console.log(`Order number sequence initialized and aligned (starts with ${startVal})`);

    // Ensure tables ID sequence is aligned with the maximum table ID to prevent primary key conflicts on table creation
    const maxTableIdResult = await prisma.$queryRaw<any[]>`
      SELECT MAX(id) as max_val FROM tables
    `;
    const maxTableId = maxTableIdResult[0]?.max_val;
    if (maxTableId) {
      await prisma.$executeRawUnsafe(`
        SELECT setval('tables_id_seq', ${maxTableId});
      `);
      console.log(`Tables sequence aligned to ${maxTableId}`);
    }
  } catch (error) {
    console.error("Error bootstrapping admin account / DB sequence:", error);
  }
}

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Express API server running on port ${PORT}`);
  await bootstrapAdmin();
});
