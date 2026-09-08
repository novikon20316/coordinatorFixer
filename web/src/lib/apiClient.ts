import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Calls the Express server's /api routes with the signed-in user's Firebase
 *  ID token attached - use this instead of Firestore for anything that must
 *  go through server-side role checks (creating a coordinator, changing a
 *  role/active flag). Never call Firestore directly for those. */
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
