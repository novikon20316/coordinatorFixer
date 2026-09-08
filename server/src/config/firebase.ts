import admin from "firebase-admin";

/**
 * Firebase Admin is only initialized once real service-account credentials
 * are provided via env vars (see .env.example). Until then, `auth`/`db`
 * stay undefined and routes that need them respond with 503 instead of
 * crashing the server at boot.
 */
let app: admin.app.App | undefined;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (projectId && clientEmail && privateKey) {
  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} else {
  console.warn(
    "[firebase] Service account env vars are missing - Firebase Admin is not initialized yet. " +
      "See server/.env.example."
  );
}

export const firebaseApp = app;
export const auth = app ? admin.auth(app) : undefined;
export const db = app ? admin.firestore(app) : undefined;
export const isFirebaseReady = () => Boolean(app);
