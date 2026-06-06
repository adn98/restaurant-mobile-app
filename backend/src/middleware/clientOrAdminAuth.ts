import { Request, Response, NextFunction } from "express";
import { apiKeyMiddleware } from "./apiKeyMiddleware";
import { adminAuthMiddleware } from "./adminAuthMiddleware";

export function clientOrAdminAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("x-api-key");
  if (apiKey) {
    return apiKeyMiddleware(req, res, next);
  }
  return adminAuthMiddleware(req, res, next);
}
