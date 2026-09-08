import { NextFunction, Request, Response } from "express";
import { UserRole } from "@admin-coordinator/shared";

export function requireRole(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
