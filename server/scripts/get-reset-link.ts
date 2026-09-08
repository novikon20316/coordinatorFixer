import "dotenv/config";
import { auth } from "../src/config/firebase";

/** One-off helper: prints a password-reset link directly, bypassing Firebase's
 *  own email delivery (useful when the templated email is slow/lands in spam
 *  on a brand-new project). Usage: npx tsx scripts/get-reset-link.ts <email> */
async function main() {
  if (!auth) {
    console.error("Firebase Admin is not configured - check server/.env");
    process.exit(1);
  }
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/get-reset-link.ts <email>");
    process.exit(1);
  }
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  // The Admin SDK always wraps this through Firebase's own hosted
  // <project>.firebaseapp.com/__/auth/action page (actionCodeSettings.url
  // only ends up as its continueUrl param) - and that page rejects even
  // freshly issued codes on this project. Pull the oobCode out and build
  // our own link straight to /reset-password instead.
  const rawLink = await auth.generatePasswordResetLink(email, {
    url: `${appUrl}/reset-password`,
    handleCodeInApp: true,
  });
  const oobCode = new URL(rawLink).searchParams.get("oobCode");
  console.log(`${appUrl}/reset-password?oobCode=${oobCode}&mode=resetPassword`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
