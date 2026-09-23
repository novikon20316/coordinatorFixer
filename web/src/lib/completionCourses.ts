import { Candidate, Student, StudentTrack } from "@admin-coordinator/shared";

function normalizeName(name: string): string {
  return name
    .replace(/[׳'"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * A student's "קורסי השלמה" (completion courses) aren't tracked on the
 * Student record itself - they come from the candidate-pool file the
 * student originally applied from (see shared/src/types/candidate.ts). Most
 * of today's imported students weren't created via the "promote candidate"
 * action (they came straight from grade-sheet imports), so there's no
 * stored candidateId link - this matches by name within the same cohort/
 * application year instead.
 *
 * Per the coordinator: a completion course only actually applies when that
 * candidate's admissions decision was CONDITIONAL ("על תנאי") - a candidate
 * admitted מן המניין/לא מן המניין may still have "*" marks in those columns
 * from an unrelated recommendation, not a real requirement. It also only
 * applies while the student is still on the COMPLETION track ("בהשלמה") -
 * once a coordinator moves them to REGULAR ("מן המניין", via שינוי סטטוס)
 * to record that they finished their השלמות, this stops showing even
 * though the underlying candidate record is unchanged.
 */
export function findRequiredCompletionCourses(
  student: Student,
  candidates: Candidate[]
): { name: string; grade?: number | string }[] {
  if (!student.cohortYear || student.track !== StudentTrack.COMPLETION) return [];
  const target = normalizeName(student.fullName);
  const match = candidates.find(
    (c) => c.applyingForYear === student.cohortYear && normalizeName(c.fullName) === target
  );
  if (!match || match.acceptanceDecision !== "CONDITIONAL") return [];
  return match.completionCourses ?? [];
}

/**
 * True once a COMPLETION-track student has an actual recorded grade (in
 * their imported academicHistory, not the candidate record's own pre-
 * admission grade) for every one of their required קורסי השלמה - i.e. the
 * coordinator now has everything needed to decide whether to move them off
 * בהשלמה. Only `typeof grade === "number"` counts as graded, same
 * convention as hasFailingGrade/syncCourseCategoriesFromHistory in
 * shared/src/utils/studentDefaults.ts, since a handful of source files use
 * placeholder text like "טרם קיבל ציון" for a not-yet-graded course. False
 * while there are no required completion courses at all (nothing to signal).
 */
export function isCompletionGradingDone(student: Student, candidates: Candidate[]): boolean {
  const required = findRequiredCompletionCourses(student, candidates);
  if (required.length === 0) return false;
  const graded = new Set<string>();
  for (const record of student.academicHistory ?? []) {
    for (const course of record.courses) {
      if (typeof course.grade === "number") graded.add(normalizeName(course.name));
    }
  }
  return required.every((c) => graded.has(normalizeName(c.name)));
}
