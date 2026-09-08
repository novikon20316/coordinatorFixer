import "dotenv/config";
import { randomBytes } from "crypto";
import { auth, db } from "../src/config/firebase";
import { UserRole } from "@admin-coordinator/shared";

/**
 * One-time bootstrap for the single system_admin account (there is no
 * client-side signup - every other account is created by an admin via
 * POST /api/users). Run with: npx tsx scripts/bootstrap-admin.ts <email>
 *
 * Requires Email/Password sign-in to be enabled once in the Firebase
 * Console (Authentication > Sign-in method) - the Admin SDK can't turn
 * that on itself, and createUser fails with auth/configuration-not-found
 * until it's done.
 */
async function main() {
  if (!auth || !db) {
    console.error("Firebase Admin is not configured - check server/.env");
    process.exit(1);
  }

  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/bootstrap-admin.ts <email>");
    process.exit(1);
  }
  const throwawayPassword = randomBytes(24).toString("base64url");

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Auth user already exists: ${userRecord.uid}`);
  } catch {
    userRecord = await auth.createUser({
      email,
      password: throwawayPassword,
      displayName: "System Admin",
    });
    console.log(`Created Auth user: ${userRecord.uid}`);
  }

  await db.collection("users").doc(userRecord.uid).set(
    {
      email,
      displayName: "System Admin",
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );
  console.log("Firestore profile set with role ADMIN.");
  console.log("Use 'Forgot Password' on the login screen with this email to set your own password.");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
