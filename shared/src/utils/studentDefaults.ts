import { Faculty, isGraduatedStatus, StudentStatus, StudentTrack } from "../constants/status";
import {
  DATA_SCIENCE_CORE_CURRICULUM_ALIASES,
  DATA_SCIENCE_CORE_CURRICULUM_COURSES,
  DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS,
  DATA_SCIENCE_PROJECT_MILESTONES,
  dataScienceCreditRequirements,
  DataScienceCreditRequirements,
} from "../constants/dataScienceCurriculum";
import { activeYearOfStudy, CURRENT_HEBREW_YEAR, HebrewYear, yearOfStudy } from "../constants/hebrewYear";
import { he } from "../i18n/he";
import { CourseCompletionCategory, CourseCompletionEntry, MilestoneProgress, SemesterRecord, Student } from "../types/student";

/** Canonical display label for each fixed category key - the source of
 *  truth for what a category is called today. A category's own `label`
 *  field is only a snapshot taken when it was first built (see
 *  buildDefaultCourseCategories below), so a student created before a label
 *  was renamed keeps showing the old text forever unless callers look it up
 *  here instead - see courseCategoryLabel. */
const CATEGORY_LABELS: Record<string, string> = {
  core_curriculum: "מקצועות חובה של המחלקה",
  core: "קורסי ליבה",
  elective: "קורסי בחירה",
};

/** The label to display for a category - always the current canonical name
 *  for a known key (core_curriculum/core/elective), ignoring whatever's
 *  stored on the category itself so a renamed label applies retroactively
 *  to every student, old and new alike. Falls back to the stored label for
 *  any other (currently nonexistent) key. */
export function courseCategoryLabel(category: Pick<CourseCompletionCategory, "key" | "label">): string {
  return CATEGORY_LABELS[category.key] ?? category.label;
}

/** Builds a fresh course-completion checklist for a newly created student.
 *  Only Data Science has a known catalog today (see dataScienceCurriculum.ts)
 *  - other faculties get no categories, same as before this feature existed.
 *  No requiredCredits is baked in here - each category's target varies by
 *  the student's cohort year (see resolveCategoryRequiredCredits below), so
 *  it's resolved fresh every time it's needed instead of stored. */
export function buildDefaultCourseCategories(faculty: Faculty): CourseCompletionCategory[] {
  if (faculty !== Faculty.DATA_SCIENCE) return [];
  return [
    {
      key: "core_curriculum",
      label: CATEGORY_LABELS.core_curriculum,
      fixedCatalog: true,
      requiredCount: DATA_SCIENCE_CORE_CURRICULUM_COURSES.length,
      entries: DATA_SCIENCE_CORE_CURRICULUM_COURSES.map((name) => ({ name, passed: false })),
    },
    {
      key: "core",
      label: CATEGORY_LABELS.core,
      fixedCatalog: false,
      requiredCount: DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS.core.requiredCount,
      entries: [],
    },
    {
      key: "elective",
      label: CATEGORY_LABELS.elective,
      fixedCatalog: false,
      requiredCount: DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS.elective.requiredCount,
      entries: [],
    },
  ];
}

/** The נ"ז target that applies to one of a student's course-completion
 *  categories, for the curriculum in force when they started (see
 *  dataScienceCreditRequirements) - undefined for a faculty with no known
 *  curriculum, or a category key it doesn't recognize (falls back to
 *  courseCategoryBalance's own sum-of-entries behavior). Resolved fresh from
 *  the student's current faculty/cohortYear rather than read from the
 *  category's own (unused) requiredCredits field, so it stays correct even
 *  for a student created before this cohort-based curriculum existed. */
export function resolveCategoryRequiredCredits(
  faculty: Faculty,
  cohortYear: HebrewYear | undefined,
  categoryKey: string
): number | undefined {
  if (faculty !== Faculty.DATA_SCIENCE) return undefined;
  const requirements = dataScienceCreditRequirements(cohortYear);
  return requirements[categoryKey as keyof DataScienceCreditRequirements];
}

/** Builds a fresh project/thesis milestone checklist for a newly created
 *  student. Only Data Science's project-track milestones are known today. */
export function buildDefaultMilestones(faculty: Faculty): MilestoneProgress[] {
  if (faculty !== Faculty.DATA_SCIENCE) return [];
  return DATA_SCIENCE_PROJECT_MILESTONES.map((m) => ({ ...m, done: false }));
}

/** A category counts toward graduation clearance once every entry it
 *  requires is checked off passed - a fixed-catalog category needs all of
 *  its (fixed-length) entries passed, a free-text category needs at least
 *  `requiredCount` passed entries (coordinators may add extra rows). */
export function isCourseCategoryComplete(category: CourseCompletionCategory): boolean {
  const passedCount = category.entries.filter((e) => e.passed).length;
  return passedCount >= category.requiredCount;
}

export function isCourseworkComplete(categories: CourseCompletionCategory[] | undefined): boolean {
  if (!categories || categories.length === 0) return false;
  return categories.every(isCourseCategoryComplete);
}

/** Generic, unfilled-slot column headers some semester-grade sheets use for
 *  a ליבה/בחירה elective before the student's actual chosen course is known
 *  (e.g. "קורס ליבה 1", "קורס בחירה 2") - the slot label, not a real course
 *  name, so never surfaced as one: excluded here from
 *  syncCourseCategoriesFromHistory's promotion, and by
 *  parseSemesterGrades.ts's IGNORED_COLUMNS from ever entering
 *  academicHistory as a "course" in the first place. */
export const GENERIC_ELECTIVE_SLOT_NAMES = new Set([
  "קורס בחירה 1",
  "קורס בחירה 2",
  "קורס בחירה 3",
  "קורס ליבה 1",
  "קורס ליבה 2",
  "קורס ליבה 3",
]);

/**
 * Fills in a student's course-completion checklist from their raw imported
 * academicHistory, without ever overwriting a grade a coordinator already
 * entered by hand. This is a pure, read-time computation (see
 * web/src/components/StudentCard.tsx, which seeds its local draft with this
 * rather than the raw stored categories) - nothing is written back to
 * Firestore just from viewing a card, so it's safe to recompute on every
 * render and works retroactively for students imported before this existed.
 *
 * - The fixed core-curriculum entries get their `name` normalized to the
 *   current Hebrew catalog (see DATA_SCIENCE_CORE_CURRICULUM_ALIASES - older
 *   records may still have the catalog's old English names, or a cohort's
 *   own alternate spelling, stored) and their `grade` filled in when a
 *   matching course is found in the history - newly filling in a grade this
 *   way marks it passed by default, same as a coordinator typing a grade in
 *   by hand (see StudentCard.tsx's grade input). An entry that already had a
 *   grade keeps its stored `passed` exactly as-is, so this never re-checks a
 *   box a coordinator deliberately unchecked.
 * - The free-text "core"/"elective" categories get any "קורס ליבה"/"קורס
 *   בחירה" course found in the history appended as a new, passed entry,
 *   skipping names already present (so re-running this is idempotent) and
 *   skipping GENERIC_ELECTIVE_SLOT_NAMES (an unfilled slot label, not a real
 *   course - see its own doc comment).
 */
export function syncCourseCategoriesFromHistory(
  categories: CourseCompletionCategory[],
  academicHistory: SemesterRecord[] | undefined
): CourseCompletionCategory[] {
  if (!academicHistory || academicHistory.length === 0) return categories;

  const allCourses = academicHistory.flatMap((r) => r.courses);
  function findGrade(names: string[]): number | undefined {
    const match = allCourses.find((c) => names.includes(c.name) && typeof c.grade === "number");
    return match ? (match.grade as number) : undefined;
  }
  function canonicalCoreCourseName(name: string): string {
    if (DATA_SCIENCE_CORE_CURRICULUM_COURSES.includes(name)) return name;
    const canonical = Object.keys(DATA_SCIENCE_CORE_CURRICULUM_ALIASES).find((c) =>
      DATA_SCIENCE_CORE_CURRICULUM_ALIASES[c].includes(name)
    );
    return canonical ?? name;
  }

  return categories.map((category) => {
    if (category.key === "core_curriculum") {
      const entries: CourseCompletionEntry[] = category.entries.map((entry) => {
        const canonicalName = canonicalCoreCourseName(entry.name);
        const aliases = [canonicalName, ...(DATA_SCIENCE_CORE_CURRICULUM_ALIASES[canonicalName] ?? [])];
        const patch: Partial<CourseCompletionEntry> = {};
        if (canonicalName !== entry.name) patch.name = canonicalName;
        if (entry.grade === undefined) {
          const grade = findGrade(aliases);
          // A synced grade defaults the course to passed, same as a
          // coordinator typing a grade in by hand (see StudentCard.tsx) -
          // still a real checkbox, so it can be unchecked afterward.
          if (grade !== undefined) Object.assign(patch, { grade, passed: true });
        }
        return Object.keys(patch).length > 0 ? { ...entry, ...patch } : entry;
      });
      return entries === category.entries ? category : { ...category, entries };
    }

    if (category.key === "core" || category.key === "elective") {
      const prefix = category.key === "core" ? "קורס ליבה" : "קורס בחירה";
      const existingNames = new Set(category.entries.map((e) => e.name));
      const extra: CourseCompletionEntry[] = [];
      for (const c of allCourses) {
        if (!c.name.startsWith(prefix) || typeof c.grade !== "number") continue;
        if (GENERIC_ELECTIVE_SLOT_NAMES.has(c.name)) continue;
        if (existingNames.has(c.name)) continue;
        existingNames.add(c.name); // also de-dupes repeat course names within the history itself
        extra.push({ name: c.name, grade: c.grade, passed: true });
      }
      return extra.length > 0 ? { ...category, entries: [...category.entries, ...extra] } : category;
    }

    return category;
  });
}

/** Label for a מחזור (cohort year) option that also names the academic year
 *  (שנה א׳/שנה ב׳/מוסמך/כת) that cohort is currently in - lets every מחזור
 *  picker in the app (add-student, student details, cohort filters) show
 *  the student's current academic year at a glance instead of a bare Hebrew
 *  year the coordinator has to convert in her head. */
export function cohortYearOptionLabel(year: HebrewYear): string {
  const yos = yearOfStudy(year);
  return `${year} (${he.studentCard.yearOfStudy[String(yos) as "1" | "2" | "GRADUATED"]})`;
}

/** Label for a specific student's own cohort year - like
 *  cohortYearOptionLabel, but the suffix is driven by the student's actual
 *  status and track rather than elapsed time. "(מוסמך/כת)" only appears once
 *  isGraduatedStatus is true (never automatically just because two Hebrew
 *  years have passed - a student who outlasts the normal two-year program
 *  without being marked graduated keeps showing as year ב, see
 *  activeYearOfStudy); a בהשלמה-track student who isn't graduated shows
 *  "(משלים/מה)" instead of a year-of-study number, since that track doesn't
 *  follow the two-year מן המניין progression. */
export function studentCohortYearLabel(cohortYear: HebrewYear, status: StudentStatus, track: StudentTrack): string {
  const label = isGraduatedStatus(status)
    ? he.studentCard.yearOfStudy.GRADUATED
    : track === StudentTrack.COMPLETION
      ? he.studentCard.yearOfStudy.COMPLETION
      : he.studentCard.yearOfStudy[String(activeYearOfStudy(cohortYear)) as "1" | "2"];
  return `${cohortYear} (${label})`;
}

/** True once a מן המניין (REGULAR-track) student's cohort has run past the
 *  normal two-year program without them being marked graduated yet - a
 *  signal for the coordinator to review, never an automatic status change:
 *  a student can legitimately take longer than two years (see
 *  activeYearOfStudy, which keeps such a student showing as year ב
 *  indefinitely), so only a coordinator decides, per student or for the
 *  whole list at once, whether to actually close them out. בהשלמה-track
 *  students are excluded since that track has no fixed length. */
export function isDueForGraduationReview(
  cohortYear: HebrewYear,
  status: StudentStatus,
  track: StudentTrack,
  asOfYear: HebrewYear = CURRENT_HEBREW_YEAR
): boolean {
  return track === StudentTrack.REGULAR && !isGraduatedStatus(status) && yearOfStudy(cohortYear, asOfYear) === "GRADUATED";
}

/** A grade below this counts as a failing attempt for the "קורס נכשל" card
 *  badge - the department's own passing threshold. */
const FAILING_GRADE_THRESHOLD = 65;

/** True once the student has a grade below FAILING_GRADE_THRESHOLD anywhere -
 *  in the graduation checklist (courseCategories) or their raw imported
 *  per-semester history - so a coordinator can spot at a glance that some
 *  retake/appeal may be needed, even for a course a later grade already
 *  overwrote in the checklist. */
export function hasFailingGrade(
  categories: CourseCompletionCategory[] | undefined,
  academicHistory: SemesterRecord[] | undefined
): boolean {
  const inCategories = (categories ?? []).some((c) =>
    c.entries.some((e) => typeof e.grade === "number" && e.grade < FAILING_GRADE_THRESHOLD)
  );
  if (inCategories) return true;
  return (academicHistory ?? []).some((r) =>
    r.courses.some((c) => typeof c.grade === "number" && c.grade < FAILING_GRADE_THRESHOLD)
  );
}

export interface CourseCategoryBalance {
  /** Total נ"ז the category asks for - normally `requiredCredits` (resolved
   *  by cohort year for Data Science, see resolveCategoryRequiredCredits).
   *  A category with no known target (no requiredCredits passed in, e.g. a
   *  faculty with no curriculum on file) falls back to the sum of whatever
   *  credits a coordinator has typed in for its course list, so the balance
   *  row still shows something sensible instead of a bare 0. */
  required: number;
  /** Sum of נ"ז from entries actually checked off passed. */
  learned: number;
  /** required minus learned - negative once learned exceeds required (a
   *  coordinator recording more נ"ז than the category strictly asks for),
   *  so the balance row can show the real surplus instead of hiding it
   *  behind a floor of 0. See totalCreditShortfall for why a surplus here
   *  still isn't allowed to offset a shortfall in another category. */
  remaining: number;
  /** Average of every entry's numeric grade in this category, or null if
   *  none has a grade yet. */
  average: number | null;
}

export function courseCategoryBalance(
  category: CourseCompletionCategory,
  requiredCredits?: number
): CourseCategoryBalance {
  const required =
    requiredCredits ??
    category.entries.reduce((sum, e) => sum + (typeof e.credits === "number" ? e.credits : 0), 0);
  const learned = category.entries.reduce(
    (sum, e) => sum + (e.passed && typeof e.credits === "number" ? e.credits : 0),
    0
  );
  const grades = category.entries.map((e) => e.grade).filter((g): g is number => typeof g === "number");
  const average = grades.length > 0 ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 100) / 100 : null;
  return { required, learned, remaining: required - learned, average };
}

/** True once any category still has נ"ז remaining per courseCategoryBalance
 *  above - used for the card's "נ"ז חסרים" badge. */
export function hasCreditShortfall(
  categories: CourseCompletionCategory[] | undefined,
  faculty: Faculty,
  cohortYear: HebrewYear | undefined
): boolean {
  return (categories ?? []).some(
    (c) => courseCategoryBalance(c, resolveCategoryRequiredCredits(faculty, cohortYear, c.key)).remaining > 0
  );
}

/** Sum of every category's `remaining` נ"ז (courseCategoryBalance above) -
 *  the total credit count still missing across the whole degree. A
 *  category's own surplus (negative remaining) is floored at 0 before
 *  summing, so having extra נ"ז in one category (e.g. ליבה) never masks a
 *  real shortfall in another (e.g. בחירה) - only each category's own balance
 *  row shows its real, un-floored surplus. */
export function totalCreditShortfall(
  categories: CourseCompletionCategory[] | undefined,
  faculty: Faculty,
  cohortYear: HebrewYear | undefined
): number {
  return (categories ?? []).reduce(
    (sum, c) =>
      sum + Math.max(courseCategoryBalance(c, resolveCategoryRequiredCredits(faculty, cohortYear, c.key)).remaining, 0),
    0
  );
}

/** True once an ACTIVE-status student has every course-completion category
 *  cleared and no נ"ז shortfall remaining - i.e. the coordinator now has
 *  everything needed to move her toward a graduated status. Read-time only,
 *  same as isCourseworkComplete/totalCreditShortfall above (courseCategories
 *  are synced from academicHistory first via syncCourseCategoriesFromHistory,
 *  since a student's stored categories can lag behind freshly imported
 *  grades). False for any faculty with no known curriculum (buildDefault-
 *  CourseCategories returns no categories there, so isCourseworkComplete is
 *  never true), same as the card's own "missing courses" badge today. */
export function isActiveCourseworkFullyDone(
  student: Pick<Student, "status" | "faculty" | "cohortYear" | "courseCategories" | "academicHistory">
): boolean {
  if (student.status !== StudentStatus.ACTIVE) return false;
  const categories = syncCourseCategoriesFromHistory(
    student.courseCategories ?? buildDefaultCourseCategories(student.faculty),
    student.academicHistory
  );
  if (!isCourseworkComplete(categories)) return false;
  return totalCreditShortfall(categories, student.faculty, student.cohortYear) === 0;
}

/** Merges one freshly-imported semester's grades into a student's existing
 *  academicHistory, replacing any prior entry for the same
 *  (yearOfStudy, semester, hebrewYear) - re-importing a file updates that
 *  semester's block instead of appending a duplicate. */
export function mergeAcademicHistory(
  existing: SemesterRecord[] | undefined,
  incoming: SemesterRecord
): SemesterRecord[] {
  const rest = (existing ?? []).filter(
    (r) =>
      !(
        r.yearOfStudy === incoming.yearOfStudy &&
        r.semester === incoming.semester &&
        r.hebrewYear === incoming.hebrewYear
      )
  );
  return [...rest, incoming];
}
