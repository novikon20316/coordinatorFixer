import { auth } from "./firebase";

// localhost only resolves to the dev server from an emulator/simulator, not
// a physical device on the same network - set EXPO_PUBLIC_API_URL to the
// dev machine's LAN IP (or deployed server URL) when testing on a real phone.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

/** Calls the Express server's /api routes with the signed-in user's Firebase
 *  ID token attached - use this instead of Firestore for anything that must
 *  go through server-side role checks (creating a coordinator, changing a
 *  role/active flag). Never write to Firestore directly for those. */
export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!auth?.currentUser) throw new Error("Not signed in");
  const token = await auth.currentUser.getIdToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}
