import { CurriculumCategoryRule, CurriculumCategoryRuleCreateInput, Faculty } from "@admin-coordinator/shared";
import { db } from "../config/firebase";

const COLLECTION = "curriculumCategoryRules";

function ensureDb() {
  if (!db) throw new Error("Firebase is not configured yet");
  return db;
}

export async function listCurriculumCategoryRules(faculty?: Faculty): Promise<CurriculumCategoryRule[]> {
  const firestore = ensureDb();
  let query: FirebaseFirestore.Query = firestore.collection(COLLECTION);
  if (faculty) query = query.where("faculty", "==", faculty);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CurriculumCategoryRule));
}

export async function createCurriculumCategoryRule(
  input: CurriculumCategoryRuleCreateInput
): Promise<CurriculumCategoryRule> {
  const firestore = ensureDb();
  const ref = await firestore.collection(COLLECTION).add({ ...input, createdAt: new Date().toISOString() });
  const created = await ref.get();
  return { id: created.id, ...created.data() } as CurriculumCategoryRule;
}

export async function deleteCurriculumCategoryRule(id: string): Promise<void> {
  const firestore = ensureDb();
  await firestore.collection(COLLECTION).doc(id).delete();
}
