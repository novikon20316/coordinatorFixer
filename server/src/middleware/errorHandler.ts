import { NextFunction, Request, Response } from "express";

// Deliberately generic response - an error message can leak internal details
// (Firestore field names, stack fragments, library error text) to the
// client. Full detail goes to the server log only.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
