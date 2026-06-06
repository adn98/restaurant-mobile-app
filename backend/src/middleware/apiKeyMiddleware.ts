import { Request, Response, NextFunction } from "express";

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("x-api-key");
  const expectedKey = process.env.MOBILE_APP_API_KEY;

  if (!expectedKey) {
    console.error("MOBILE_APP_API_KEY is not defined in environment variables.");
    return res.status(500).json({ error: "Internal Server Configuration Error" });
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
  }

  next();
}
