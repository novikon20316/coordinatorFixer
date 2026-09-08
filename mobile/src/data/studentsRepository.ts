import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Faculty, Student, StudentTrack } from "@admin-coordinator/shared";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { mockStudents } from "./mockStudents";

/**
 * Until Firebase is connected, subscriptions resolve immediately with local
 * mock data so the dashboard is usable during development. Swapping to
 * Firestore requires no call-site changes once `isFirebaseConfigured` flips.
 */
export function subscribeStudents(
  faculty: Faculty,
  track: StudentTrack,
  onData: (students: Student[]) => void
): () => void {
  if (!isFirebaseConfigured || !db) {
    onData(mockStudents.filter((s) => s.faculty === faculty && s.track === track));
    return () => {};
  }

  const q = query(
    collection(db, "students"),
    where("faculty", "==", faculty),
    where("track", "==", track)
  );

  return onSnapshot(q, (snapshot) => {
    onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Student)));
  });
}
