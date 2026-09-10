import { Candidate, CandidateCreateInput, CandidateFilters, CandidateUpdateInput } from "@admin-coordinator/shared";
import { db } from "../config/firebase";

const COLLECTION = "candidates";

function ensureDb() {
  if (!db) throw new Error("Firebase is not configured yet");
  return db;
}

export async function listCandidates(filters: CandidateFilters = {}): Promise<Candidate[]> {
  const firestore = ensureDb();
  let query: FirebaseFirestore.Query = firestore.collection(COLLECTION);

  if (filters.faculty) query = query.where("faculty", "==", filters.faculty);
  if (filters.applyingForYear) query = query.where("applyingForYear", "==", filters.applyingForYear);
  if (filters.status) query = query.where("status", "==", filters.status);

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Candidate));
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const firestore = ensureDb();
  const doc = await firestore.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Candidate;
}

export async function createCandidate(input: CandidateCreateInput): Promise<Candidate> {
  const firestore = ensureDb();
  const now = new Date().toISOString();
  const ref = await firestore.collection(COLLECTION).add({
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return { id: created.id, ...created.data() } as Candidate;
}

export async function updateCandidate(id: string, input: CandidateUpdateInput): Promise<Candidate> {
  const firestore = ensureDb();
  const ref = firestore.collection(COLLECTION).doc(id);
  await ref.update({ ...input, updatedAt: new Date().toISOString() });
  const updated = await ref.get();
  return { id: updated.id, ...updated.data() } as Candidate;
}

export async function deleteCandidate(id: string): Promise<void> {
  const firestore = ensureDb();
  await firestore.collection(COLLECTION).doc(id).delete();
}
