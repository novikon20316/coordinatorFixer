/**
 * All enum-like values use language-agnostic keys (not Hebrew strings) so that
 * additional display languages can be added later by extending the label maps
 * in `shared/src/i18n` without touching stored data or business logic.
 */

export enum StudentStatus {
  ACTIVE = "ACTIVE", // פעיל
  REGISTERED = "REGISTERED", // נרשם
  REJECTED = "REJECTED", // לא התקבל
  CANCELED = "CANCELED", // בוטל על ידי התלמיד
}

export const STUDENT_STATUS_VALUES: StudentStatus[] = [
  StudentStatus.ACTIVE,
  StudentStatus.REGISTERED,
  StudentStatus.REJECTED,
  StudentStatus.CANCELED,
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
