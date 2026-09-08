import "dotenv/config";
import { auth } from "../src/config/firebase";

/** Dev-only helper: mints a real Firebase ID token for a uid, for testing
 *  protected API routes with curl without needing that account's password.
 *  Usage: npx tsx scripts/dev-get-id-token.ts <uid> */
async function main() {
  if (!auth) {
    console.error("Firebase Admin is not configured - check server/.env");
    process.exit(1);
  }
  const uid = process.argv[2];
  if (!uid) {
    console.error("Usage: npx tsx scripts/dev-get-id-token.ts <uid>");
    process.exit(1);
  }
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    console.error("Set FIREBASE_WEB_API_KEY in server/.env (the web app's apiKey) to exchange the custom token.");
    process.exit(1);
  }

  const customToken = await auth.createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    console.error(data);
    process.exit(1);
  }
  console.log(data.idToken);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
