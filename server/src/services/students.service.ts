import {
  buildDefaultCourseCategories,
  buildDefaultMilestones,
  Student,
  StudentCreateInput,
  StudentFilters,
  StudentStatus,
  StudentTrack,
  StudentUpdateInput,
} from "@admin-coordinator/shared";
import { db } from "../config/firebase";
import { listCurriculumCategoryRules } from "./curriculumRules.service";

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

// A בהשלמה-track student isn't "מן המניין" by definition, so ACTIVE (which
// implies a regular-track student in good standing) doesn't apply to them -
// they default to NOT_REGULAR instead. Only ACTIVE is overridden; a
// coordinator's own choice of any other status (including the two graduated
// ones) always wins.
function normalizeStatusForTrack<T extends { track?: StudentTrack; status?: StudentStatus }>(input: T): T {
  if (input.track === StudentTrack.COMPLETION && input.status === StudentStatus.ACTIVE) {
    return { ...input, status: StudentStatus.NOT_REGULAR };
  }
  return input;
}

export async function createStudent(input: StudentCreateInput): Promise<Student> {
  const firestore = ensureDb();
  const now = new Date().toISOString();
  // Any admin-created CurriculumCategoryRule effective for this student's own
  // cohort (see the תיקוני תוכנית לימודים page) must already apply the moment
  // they're created, not just to students an admin bulk-corrects afterward.
  const rules = await listCurriculumCategoryRules(input.faculty);
  const ref = await firestore.collection(COLLECTION).add({
    // Callers (the quick-add bar, the bulk importer) don't know this
    // department's course/milestone catalog - seed it here so every new
    // student starts with the right checklist instead of an empty one.
    courseCategories: buildDefaultCourseCategories(input.faculty, input.cohortYear, rules),
    milestones: buildDefaultMilestones(input.faculty),
    ...normalizeStatusForTrack(input),
    createdAt: now,
    updatedAt: now,
  });
  const created = await ref.get();
  return { id: created.id, ...created.data() } as Student;
}

export async function updateStudent(id: string, input: StudentUpdateInput): Promise<void> {
  const firestore = ensureDb();
  const ref = firestore.collection(COLLECTION).doc(id);
  let patch = normalizeStatusForTrack(input);
  // Track and status can be edited independently (e.g. the student detail
  // modal only ever patches track) - if this update moves a student into
  // בהשלמה without touching status, re-check against their current status
  // too, so they don't keep showing ACTIVE just because this particular
  // patch didn't mention it.
  if (patch.track === StudentTrack.COMPLETION && patch.status === undefined) {
    const current = await ref.get();
    if ((current.data() as Student | undefined)?.status === StudentStatus.ACTIVE) {
      patch = { ...patch, status: StudentStatus.NOT_REGULAR };
    }
  }
  await ref.update({ ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteStudent(id: string): Promise<void> {
  const firestore = ensureDb();
  await firestore.collection(COLLECTION).doc(id).delete();
}
