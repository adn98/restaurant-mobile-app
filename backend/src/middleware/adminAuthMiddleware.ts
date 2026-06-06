import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    username: string;
  };
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Access Denied: No Token Provided" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not configured in backend environment.");
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { id: string; username: string };
    (req as AuthenticatedRequest).admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Forbidden: Invalid or Expired Token" });
  }
}
