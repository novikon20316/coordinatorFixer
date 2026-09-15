import {
  buildDefaultCourseCategories,
  buildDefaultMilestones,
  Student,
  StudentCreateInput,
  StudentFilters,
  StudentUpdateInput,
} from "@admin-coordinator/shared";
import { db } from "../config/firebase";

const COLLECTION = "students";

function ensureDb() {
  if (!db) throw new Error("Firebase is not configured yet");
  return db;
}

export async function listStudents(filters: StudentFilters = {}): Promise<Student[]> {
  const firestore = ensureDb();
  let query: FirebaseFirestore.Query = firestore.collection(COLLECTION);

  if (filters.faculty) query = query.where("faculty", "==", filters.faculty);
  if (filters.track) query = query.where("track", "==", filters.track);
  if (filters.status) query = query.where("status", "==", filters.status);
  if (filters.degreeType) query = query.where("degreeType", "==", filters.degreeType);

  const snapshot = await query.get();
  let students = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Student));

  if (filters.previousCollege) {
    students = students.filter((s) => s.previousCollege === filters.previousCollege);
  }
  if (filters.degreeField) {
    students = students.filter((s) => s.degreeField === filters.degreeField);
  }
  if (filters.minGpa !== undefined) {
    students = students.filter((s) => s.gpa >= filters.minGpa!);
  }
  if (filters.maxGpa !== undefined) {
    students = students.filter((s) => s.gpa <= filters.maxGpa!);
  }

  return students;
}

export async function getStudent(id: string): Promise<Student | null> {
  const firestore = ensureDb();
  const doc = await firestore.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Student;
}

export async function createStudent(input: StudentCreateInput): Promise<Student> {
  const firestore = ensureDb();
  const now = new Date().toISOString();
  const ref = await firestore.collection(COLLECTION).add({
    // Callers (the quick-add bar, the bulk importer) don't know this
    // department's course/milestone catalog - seed it here so every new
    // student starts with the right checklist instead of an empty one.
    courseCategories: buildDefaultCourseCategories(input.faculty),
    milestones: buildDefaultMilestones(input.faculty),
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return { id: created.id, ...created.data() } as Student;
}

export async function updateStudent(id: string, input: StudentUpdateInput): Promise<void> {
  const firestore = ensureDb();
  const ref = firestore.collection(COLLECTION).doc(id);
  await ref.update({ ...input, updatedAt: new Date().toISOString() });
}

export async function deleteStudent(id: string): Promise<void> {
  const firestore = ensureDb();
  await firestore.collection(COLLECTION).doc(id).delete();
}
