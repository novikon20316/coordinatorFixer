import { NextFunction, Request, Response } from "express";
import { UserRole } from "@admin-coordinator/shared";
import { auth, db, isFirebaseReady } from "../config/firebase";

/**
 * Verifies the Firebase ID token sent as `Authorization: Bearer <token>`,
 * then looks up the caller's role from the `users` Firestore collection
 * (role is never trusted from the client). A user with no Firestore
 * profile, or one flagged `isActive: false`, is rejected rather than
 * silently treated as a low-privilege coordinator - every account here
 * handles student personal data, so there is no safe default role to fall
 * back to.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isFirebaseReady() || !auth || !db) {
    return res.status(503).json({ error: "Firebase is not configured yet" });
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: "No account profile - contact the system admin" });
    }

    const data = userDoc.data()!;
    if (data.isActive === false) {
      return res.status(403).json({ error: "Account has been disabled" });
    }

    const role = data.role as UserRole | undefined;
    if (role !== UserRole.ADMIN && role !== UserRole.COORDINATOR) {
      return res.status(403).json({ error: "Account has no valid role assigned" });
    }

    req.user = { uid, email: email ?? "", role };
    next();
  } catch (err) {
    console.error("requireAuth: failed to resolve user profile", err);
    res.status(500).json({ error: "Failed to resolve authenticated user" });
  }
}
