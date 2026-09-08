import "dotenv/config";
import { auth, db } from "../src/config/firebase";

/** Dev-only cleanup helper. Usage: npx tsx scripts/dev-delete-user.ts <uid> */
async function main() {
  const uid = process.argv[2];
  if (!auth || !db || !uid) {
    console.error("Usage: npx tsx scripts/dev-delete-user.ts <uid>");
    process.exit(1);
  }
  await auth.deleteUser(uid);
  await db.collection("users").doc(uid).delete();
  console.log(`Deleted ${uid}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
