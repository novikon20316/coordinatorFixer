"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Candidate, Faculty } from "@admin-coordinator/shared";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { mockCandidates } from "./mockCandidates";

/** Same subscribe/mock-fallback shape as studentsRepository.ts's
 *  subscribeStudents - see that file's comment. */
export function subscribeCandidates(faculty: Faculty, onData: (candidates: Candidate[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    onData(mockCandidates.filter((c) => c.faculty === faculty));
    return () => {};
  }

  const q = query(collection(db, "candidates"), where("faculty", "==", faculty));

  return onSnapshot(q, (snapshot) => {
    onData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Candidate)));
  });
}
