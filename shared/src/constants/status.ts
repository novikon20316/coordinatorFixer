/**
 * All enum-like values use language-agnostic keys (not Hebrew strings) so that
 * additional display languages can be added later by extending the label maps
 * in `shared/src/i18n` without touching stored data or business logic.
 */

/**
 * The college's own 8-value status vocabulary (given 2026-09, meanings to
 * follow) - replaces an earlier, narrower 5-value set (ACTIVE/REGISTERED/
 * REJECTED/CANCELED/GRADUATED). Candidates (see types/candidate.ts) now own
 * the admissions-review lifecycle a Student's old REGISTERED value used to
 * cover, so a newly created Student starts ACTIVE instead.
 */
export enum StudentStatus {
  ACTIVE = "ACTIVE", // פעיל
  CANCELED_REGISTRATION = "CANCELED_REGISTRATION", // ביטל הרשמה
  INTERNAL_MAPPING = "INTERNAL_MAPPING", // מיפוי פנימי
  NOT_REGULAR = "NOT_REGULAR", // לא מן המניין
  CONDITIONAL = "CONDITIONAL", // על תנאי
  ON_LEAVE = "ON_LEAVE", // בחופשה
  GRADUATED_ELIGIBLE = "GRADUATED_ELIGIBLE", // מוסמך סיים טופס טיולים וזכאי לתואר
  GRADUATED_PENDING = "GRADUATED_PENDING", // מוסמך/כת בטופס טיולים לקראת זכאות לתואר
}

export const STUDENT_STATUS_VALUES: StudentStatus[] = [
  StudentStatus.ACTIVE,
  StudentStatus.CANCELED_REGISTRATION,
  StudentStatus.INTERNAL_MAPPING,
  StudentStatus.NOT_REGULAR,
  StudentStatus.CONDITIONAL,
  StudentStatus.ON_LEAVE,
  StudentStatus.GRADUATED_ELIGIBLE,
  StudentStatus.GRADUATED_PENDING,
];

/** Either "בוגר" status counts for the dashboard's Graduates tab and the
 *  Reports page - see dashboard/page.tsx and reports/page.tsx. */
export function isGraduatedStatus(status: StudentStatus): boolean {
  return status === StudentStatus.GRADUATED_ELIGIBLE || status === StudentStatus.GRADUATED_PENDING;
}

// A candidate's admissions-committee lifecycle - separate from StudentStatus
// since a Candidate (see types/candidate.ts) is a distinct record from a
// Student; PENDING candidates aren't students yet at all.
export enum CandidateStatus {
  PENDING = "PENDING", // בבדיקה
  ACCEPTED = "ACCEPTED", // התקבל
  REJECTED = "REJECTED", // נדחה
  WITHDRAWN = "WITHDRAWN", // ביטל מועמדות
}

export const CANDIDATE_STATUS_VALUES: CandidateStatus[] = [
  CandidateStatus.PENDING,
  CandidateStatus.ACCEPTED,
  CandidateStatus.REJECTED,
  CandidateStatus.WITHDRAWN,
];

export enum StudentTrack {
  REGULAR = "REGULAR", // מן המניין
  COMPLETION = "COMPLETION", // בהשלמה
}

export const STUDENT_TRACK_VALUES: StudentTrack[] = [
  StudentTrack.REGULAR,
  StudentTrack.COMPLETION,
];

export enum DegreeType {
  BA = "BA",
  BSC = "BSC",
  OTHER = "OTHER",
}

export const DEGREE_TYPE_VALUES: DegreeType[] = [
  DegreeType.BA,
  DegreeType.BSC,
  DegreeType.OTHER,
];

export enum UserRole {
  ADMIN = "ADMIN",
  COORDINATOR = "COORDINATOR",
}

// The college's real faculties (matches the canonical list maintained in the
// sibling HIT system at organization-all-system/web/lib/faculties.ts). Every
// coordinator belongs to exactly one; the student dashboard itself only
// handles DATA_SCIENCE for now, but coordinator accounts can be assigned to
// any of them.
export enum Faculty {
  SCIENCES = "SCIENCES",
  ELECTRICAL = "ELECTRICAL",
  INDUSTRIAL = "INDUSTRIAL",
  LEARNING_TECH = "LEARNING_TECH",
  MEDICAL_TECH = "MEDICAL_TECH",
  DESIGN = "DESIGN",
  DATA_SCIENCE = "DATA_SCIENCE",
}

export const FACULTY_VALUES: Faculty[] = [
  Faculty.SCIENCES,
  Faculty.ELECTRICAL,
  Faculty.INDUSTRIAL,
  Faculty.LEARNING_TECH,
  Faculty.MEDICAL_TECH,
  Faculty.DESIGN,
  Faculty.DATA_SCIENCE,
];
