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
