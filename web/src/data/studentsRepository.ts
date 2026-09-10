"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Faculty, Student } from "@admin-coordinator/shared";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { mockStudents } from "./mockStudents";

/**
 * Until Firebase is connected, subscriptions resolve immediately with local
 * mock data so the dashboard is usable during development. Swapping to
 * Firestore requires no call-site changes once `isFirebaseConfigured` flips.
 *
 * Fetches every student in the faculty (not filtered by track/status) - the
 * dashboard needs to slice the same list several ways (track tabs, the
 * graduates tab, the cohort filter), so filtering happens client-side rather
 * than needing a new Firestore query shape per dimension.
 */
export function subscribeStudents(faculty: Faculty, onData: (students: Student[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    onData(mockStudents.filter((s) => s.faculty === faculty));
    return () => {};
  }

  const q = query(collection(db, "students"), where("faculty", "==", faculty));

  return onSnapshot(q, (snapshot) => {
    onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Student)));
  });
}
