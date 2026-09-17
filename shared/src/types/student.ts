import { DegreeType, Faculty, StudentStatus, StudentTrack } from "../constants/status";
import { HebrewYear } from "../constants/hebrewYear";

/** One entry in a course-completion category - either a checked-off catalog
 *  course (see CourseCompletionCategory.entries for the fixed-catalog case)
 *  or a freely-typed course (core/elective categories, whose real course
 *  lists vary by year and aren't a fixed catalog). `name` is editable even
 *  for a fixed-catalog entry - the catalog itself only fixes how many
 *  entries a category has, not what a given student's course was actually
 *  called; a coordinator can rename an entry to match a student who studied
 *  under an older course-name template (see DATA_SCIENCE_CORE_CURRICULUM_ALIASES
 *  in dataScienceCurriculum.ts for the cases already known well enough to
 *  match automatically - a manual rename here is for the rest). */
export interface CourseCompletionEntry {
  name: string;
  credits?: number;
  grade?: number;
  /** Passing the course - toggled by the coordinator, not auto-derived from
   *  `grade`, since a course can be recorded (grade pending) before it's
   *  known to count. */
  passed: boolean;
}

/** One graduation requirement group on a student's card (e.g. the core
 *  curriculum, or the core/elective course quota) - see
 *  shared/src/constants/dataScienceCurriculum.ts for Data Science's real
 *  values. `entries` is always exactly `requiredCount` long for a
 *  fixed-catalog category (one entry per catalog course); for a free-text
 *  category coordinators add/remove rows themselves via the "+" control. */
export interface CourseCompletionCategory {
  key: string;
  label: string;
  /** Whether `entries` is a fixed catalog list (checkbox per course, no
   *  add/remove) or freely added/removed by the coordinator. */
  fixedCatalog: boolean;
  requiredCount: number;
  requiredCredits?: number;
  entries: CourseCompletionEntry[];
}

/** One checklist item in a student's project/thesis milestone tracker - see
 *  DATA_SCIENCE_PROJECT_MILESTONES for Data Science's real, ordered list. */
export interface MilestoneProgress {
  key: string;
  nameHe: string;
  nameEn: string;
  done: boolean;
  /** ציון אבן הדרך - only present once organization-all-system (the sibling
   *  HIT system that actually runs the project/thesis workflow) has graded
   *  it; a coordinator never types into this directly. See
   *  web/src/lib/import/parseProjectProgress.ts. */
  grade?: number;
  /** Due date as an ISO string, mirrored from organization-all-system as-is
   *  (that system owns the real deadline; this is display-only here). */
  dueDate?: string;
  /** organization-all-system's own status string for this milestone (e.g.
   *  "pending"/"submitted"/"graded"/"coordinator_approved"/"completed") -
   *  kept verbatim rather than translated, since this system doesn't run the
   *  workflow and has no authoritative meaning for the intermediate states.
   *  Absent for a milestone that was never matched to a synced one. */
  externalStatus?: string;
}

/** One course/grade pair as reported in a department grade sheet for one
 *  semester - see SemesterRecord. `grade` is left as string|number since a
 *  handful of source files use text like "טרם קיבל ציון" (not yet graded)
 *  instead of a number. */
export interface SemesterCourseGrade {
  name: string;
  grade?: number | string;
  /** שם המרצה שלימד את הקורס באותו סמסטר - not sourced from any imported
   *  grade sheet (those don't carry it), filled in by hand by the
   *  coordinator from the History tab (see web/src/app/(app)/history). */
  lecturer?: string;
}

/** One semester's worth of raw, faithfully-imported grades for a student -
 *  see the module comment on `academicHistory` below for why this is kept
 *  separate from courseCategories. `hebrewYear` is always derived from the
 *  student's cohortYear + yearOfStudy (see constants/hebrewYear.ts), not
 *  copied from whatever a source file's own header happened to print, since
 *  those have been observed to carry stale copy-paste labels. */
export interface SemesterRecord {
  yearOfStudy: 1 | 2;
  semester: "A" | "B";
  hebrewYear: HebrewYear;
  courses: SemesterCourseGrade[];
  semesterAverage?: number;
}

export interface Student {
  id: string;
  fullName: string;
  /** תעודת זהות */
  idNumber: string;
  faculty: Faculty;
  track: StudentTrack;
  status: StudentStatus;

  /** The Hebrew year this student started the program (מחזור) - drives the
   *  computed "year of study" badge (see constants/hebrewYear.ts's
   *  yearOfStudy) instead of storing a year-of-study snapshot that would go
   *  stale as Hebrew years roll over. */
  cohortYear?: HebrewYear;
  /** The Hebrew year this student actually finished the program - set by a
   *  coordinator the moment they mark the student with one of the two
   *  graduated statuses (see isGraduatedStatus in constants/status.ts), via
   *  StatusChangeModal/BulkStatusChangeModal. Kept separate from cohortYear
   *  since the program nominally runs 2 years but a student can legitimately
   *  take longer - this is the real finish year, not a computed one. Drives
   *  which cohort-filter years show the student under the dashboard's
   *  graduates tab (see dashboard/page.tsx); a record saved before this
   *  field existed falls back to an approximation there instead. */
  graduationYear?: HebrewYear;
  /** True once this student has ever been on the COMPLETION track
   *  ("בהשלמה"), even after a coordinator later moves them to REGULAR
   *  ("מן המניין") once they finish their קורסי השלמה - `track` alone only
   *  reflects the current state, so this is set (and never unset) the
   *  moment a save observes COMPLETION on either side of the change (see
   *  StudentDetailModal.tsx). Drives the "האם היה בהשלמה" report column. */
  wasEverCompletion?: boolean;
  /** Raw per-semester grades as reported in the department's own grade
   *  sheets, one entry per (yearOfStudy, semester) - see SemesterRecord.
   *  Deliberately NOT auto-mapped into courseCategories below: course names
   *  vary slightly across years/files, so blind fuzzy-matching risked
   *  silently marking the wrong graduation requirement complete. This is the
   *  faithful source-of-record a coordinator reads while filling in
   *  courseCategories themselves. */
  academicHistory?: SemesterRecord[];
  /** Free-text home for imported remarks that don't fit a typed field -
   *  scholarship notes, dropout date, admission-committee rationale, etc. */
  notes?: string;
  /** Set when this record was created via the Candidate "promote" action -
   *  see types/candidate.ts - points back at the originating Candidate. */
  candidateId?: string;

  /** שם הפרויקט/התזה */
  projectTitle?: string;
  /** שם המנחה */
  supervisorName?: string;
  /** Ordered checklist the coordinator checks off as the student clears each
   *  milestone of their project/thesis - see MilestoneProgress. */
  milestones?: MilestoneProgress[];
  /** ציון סופי לפרויקט/תזה - entered once the whole process is graded. */
  finalGrade?: number;
  /** Graduation coursework requirements (core curriculum + core + elective) -
   *  see CourseCompletionCategory. Undefined for faculties with no known
   *  catalog yet (only Data Science is modeled today). */
  courseCategories?: CourseCompletionCategory[];

  /** המכללה האקדמית הקודמת */
  previousCollege: string;
  /** תחום התואר (מדעי המחשב, הנדסת חשמל ואלקטרוניקה, מדעי הרוח וכו') */
  degreeField: string;
  /** סוג התואר */
  degreeType: DegreeType;
  /** ממוצע ציונים בתואר */
  gpa: number;
  /** רקע התלמיד - ניסיון תעסוקתי / עיסוק */
  background: string;

  /**
   * How this record entered the system. Absent/"MANUAL" for records created
   * one-by-one via the dashboard's "add student" form. "IMPORTED" for rows
   * brought in through the bulk import (see StudentImportRow in
   * types/import.ts) - the dashboard uses this to flag records that likely
   * still need a coordinator to fill in fields the source system doesn't
   * have (previousCollege/degreeField/gpa/background).
   */
  source?: "MANUAL" | "IMPORTED";
  /**
   * The id of this person in the source system an import came from (e.g. the
   * organization-all-system Firebase uid), kept so a future automatic sync
   * can recognize a student it already imported instead of creating a
   * duplicate. Never set for manually-created records.
   */
  externalId?: string;

  createdAt: string;
  updatedAt: string;
}

export type StudentCreateInput = Omit<Student, "id" | "createdAt" | "updatedAt">;
export type StudentUpdateInput = Partial<StudentCreateInput>;

export interface StudentFilters {
  faculty?: Faculty;
  track?: StudentTrack;
  status?: StudentStatus;
  degreeType?: DegreeType;
  previousCollege?: string;
  degreeField?: string;
  minGpa?: number;
  maxGpa?: number;
}
