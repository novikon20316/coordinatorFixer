import "dotenv/config";
import { auth } from "../src/config/firebase";

/** Dev-only inspection helper. Usage: npx tsx scripts/dev-check-user.ts <email> */
async function main() {
  if (!auth) {
    console.error("Firebase Admin is not configured - check server/.env");
    process.exit(1);
  }
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/dev-check-user.ts <email>");
    process.exit(1);
  }
  const user = await auth.getUserByEmail(email);
  console.log(
    JSON.stringify(
      {
        uid: user.uid,
        email: user.email,
        providers: user.providerData.map((p) => ({ providerId: p.providerId, uid: p.uid })),
      },
      null,
      2
    )
  );
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
