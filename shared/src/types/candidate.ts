import { CandidateStatus, Faculty } from "../constants/status";
import { HebrewYear } from "../constants/hebrewYear";

/**
 * An admissions candidate - distinct from Student (see types/student.ts).
 * Candidate-pool files (מועמדים) are not tied to the students who actually
 * enroll: they carry committee-review fields Student has no equivalent for
 * (completion-course grades, the committee's written opinion), and a
 * candidate file's title year is not necessarily the cohort a candidate
 * ends up joining. A candidate becomes a Student explicitly via the
 * "promote" action (see server/src/controllers/candidates.controller.ts),
 * which copies over the fields that carry across and sets
 * Student.candidateId back to this record.
 */
export interface Candidate {
  id: string;
  fullName: string;
  /** תעודת זהות - not every candidate-pool file includes this column. */
  idNumber?: string;
  faculty: Faculty;
  /** Which Hebrew-year cohort this candidate is being considered for -
   *  independent of any source file's title year. */
  applyingForYear: HebrewYear;

  /** המכללה האקדמית הקודמת */
  previousCollege: string;
  /** תחום התואר הקודם */
  degreeField: string;
  /** ממוצע ציונים בתואר הקודם */
  gpa: number;
  /** רקע התלמיד - ניסיון תעסוקתי / עיסוק */
  background: string;

  /** קורסי השלמה - completion-course grades required before/alongside admission. */
  completionCourses?: { name: string; grade?: number | string }[];
  /** ממוצע השלמות */
  completionAverage?: number;
  /** החלטת ועדת הקבלה: מן המניין / על תנאי / לא מן המניין */
  acceptanceDecision?: "REGULAR" | "CONDITIONAL" | "NOT_REGULAR" | "";
  /** חוות דעת הוועדה / הערות */
  committeeNotes?: string;

  status: CandidateStatus;
  /** Set once this candidate is promoted to a Student record. */
  promotedStudentId?: string;

  source?: "MANUAL" | "IMPORTED";

  createdAt: string;
  updatedAt: string;
}

export type CandidateCreateInput = Omit<Candidate, "id" | "createdAt" | "updatedAt">;
export type CandidateUpdateInput = Partial<CandidateCreateInput>;

export interface CandidateFilters {
  faculty?: Faculty;
  applyingForYear?: HebrewYear;
  status?: CandidateStatus;
}
