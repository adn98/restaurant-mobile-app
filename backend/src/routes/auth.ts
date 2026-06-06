import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { z } from "zod";
import { adminAuthMiddleware, AuthenticatedRequest } from "../middleware/adminAuthMiddleware";

const prisma = new PrismaClient();
const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Administrator Login
 *     description: Authenticates admin credentials, issues a short-lived Access Token (15m) and sets a long-lived Refresh Token (7d) as an HTTP-only cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 admin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({
      where: { username: body.username },
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const passwordValid = await bcrypt.compare(body.password, admin.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const jwtSecret = process.env.JWT_SECRET || "pos-admin-access-token-secret-key-xyz-789-abc";
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "pos-admin-refresh-token-secret-key-xyz-789-abc";

    const accessToken = jwt.sign(
      { id: admin.id, username: admin.username },
      jwtSecret,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: admin.id, username: admin.username },
      jwtRefreshSecret,
      { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      accessToken,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     description: Refreshes the short-lived access token using the HttpOnly refresh token cookie.
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Refresh token missing or expired
 */
router.post("/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh Token Missing" });
  }

  const jwtSecret = process.env.JWT_SECRET || "pos-admin-access-token-secret-key-xyz-789-abc";
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "pos-admin-refresh-token-secret-key-xyz-789-abc";

  try {
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { id: string; username: string };
    
    // Optional: check if admin still exists in db
    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
    if (!admin) {
      return res.status(401).json({ error: "Admin account not found" });
    }

    const accessToken = jwt.sign(
      { id: admin.id, username: admin.username },
      jwtSecret,
      { expiresIn: "15m" }
    );

    return res.json({ accessToken });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or Expired Refresh Token" });
  }
});

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Administrator Logout
 *     description: Clears the HttpOnly refresh token cookie.
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.json({ message: "Logout successful" });
});

const registerAdminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  currentAdminPassword: z.string().min(1, "Current password is required"),
});

router.post("/register-admin", adminAuthMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const body = registerAdminSchema.parse(req.body);

    const currentAdmin = await prisma.admin.findUnique({
      where: { id: authReq.admin?.id },
    });

    if (!currentAdmin) {
      return res.status(404).json({ error: "Current admin profile not found" });
    }

    const isPasswordValid = await bcrypt.compare(body.currentAdminPassword, currentAdmin.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Incorrect current admin password" });
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { username: body.username },
    });
    if (existingAdmin) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    const newAdmin = await prisma.admin.create({
      data: {
        username: body.username,
        passwordHash,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: currentAdmin.id,
        action: "ADMIN_CREATED",
        entityType: "Admin",
        entityId: newAdmin.id,
      },
    });

    return res.status(201).json({
      message: "New administrator registered successfully",
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Register Admin Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
