import { NextFunction, Request, Response } from "express";
import { FACULTY_VALUES, Faculty, UserRole } from "@admin-coordinator/shared";
import { auth, db } from "../config/firebase";

const COLLECTION = "users";

/** Admin-only: list all coordinator/admin accounts. */
export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const snapshot = await db!.collection(COLLECTION).get();
    res.json(snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() })));
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-only: create a coordinator account (Firebase Auth user + Firestore
 * profile). Always creates role COORDINATOR - there is deliberately no way
 * to create another ADMIN through this app; that's a single, manually
 * bootstrapped account (see scripts/bootstrap-admin.ts).
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, displayName, facultyId } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
      facultyId?: Faculty;
    };

    if (!email || !password || !displayName || !facultyId) {
      return res.status(400).json({ error: "email, password, displayName and facultyId are required" });
    }
    if (!FACULTY_VALUES.includes(facultyId)) {
      return res.status(400).json({ error: "Invalid facultyId" });
    }

    const userRecord = await auth!.createUser({ email, password, displayName });
    const profile = {
      email,
      displayName,
      role: UserRole.COORDINATOR,
      facultyId,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    await db!.collection(COLLECTION).doc(userRecord.uid).set(profile);

    res.status(201).json({ uid: userRecord.uid, ...profile });
  } catch (err) {
    next(err);
  }
}

/** Admin-only: change a user's role. */
export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = req.body as { role: UserRole };
    await db!.collection(COLLECTION).doc(req.params.uid).update({ role });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Admin-only: enable/disable a coordinator's access without deleting their
 * Firebase Auth account or history. Takes effect immediately - both the
 * server's requireAuth and the Firestore security rules check isActive.
 */
export async function updateUserActive(req: Request, res: Response, next: NextFunction) {
  try {
    const { isActive } = req.body as { isActive: boolean };
    await db!.collection(COLLECTION).doc(req.params.uid).update({ isActive });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
