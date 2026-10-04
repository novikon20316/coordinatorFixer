import { Faculty, isGraduatedStatus, StudentStatus, StudentTrack } from "../constants/status";
import {
  canonicalCoreCourseName,
  DATA_SCIENCE_CORE_CURRICULUM_ALIASES,
  DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS,
  DATA_SCIENCE_PROJECT_MILESTONES,
  dataScienceCoreCurriculumCourses,
  dataScienceCreditRequirements,
  DataScienceCreditRequirements,
} from "../constants/dataScienceCurriculum";
import { activeYearOfStudy, CURRENT_HEBREW_YEAR, HebrewYear, yearOfStudy } from "../constants/hebrewYear";
import { he } from "../i18n/he";
import { CourseCompletionCategory, CourseCompletionEntry, MilestoneProgress, SemesterRecord, Student } from "../types/student";
import { CurriculumCategoryRule } from "../types/curriculumRule";

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

/** Same lookup as courseCategoryLabel, for a bare category key rather than a
 *  whole category object - used by UI that lets an admin pick a category by
 *  key before any entry/category object exists (e.g. the curriculum
 *  correction tool's category-reassignment form). */
export function courseCategoryKeyLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

/** Builds a fresh course-completion checklist for a newly created student.
 *  Only Data Science has a known catalog today (see dataScienceCurriculum.ts)
 *  - other faculties get no categories, same as before this feature existed.
 *  No requiredCredits is baked in here - each category's target varies by
 *  the student's cohort year (see resolveCategoryRequiredCredits below), so
 *  it's resolved fresh every time it's needed instead of stored. `cohortYear`
 *  and `rules` (admin-created CurriculumCategoryRule entries) determine which
 *  courses are actually in the core-curriculum catalog for this student - see
 *  dataScienceCoreCurriculumCourses. Both are optional and default to "no
 *  rules applied" (the original, unfiltered catalog), so every existing
 *  caller that only ever cared about the faculty keeps working unchanged. */
export function buildDefaultCourseCategories(
  faculty: Faculty,
  cohortYear?: HebrewYear,
  rules: CurriculumCategoryRule[] = []
): CourseCompletionCategory[] {
  if (faculty !== Faculty.DATA_SCIENCE) return [];
  const coreCurriculumCourses = dataScienceCoreCurriculumCourses(cohortYear, rules);
  return [
    {
      key: "core_curriculum",
      label: CATEGORY_LABELS.core_curriculum,
      fixedCatalog: true,
      requiredCount: coreCurriculumCourses.length,
      entries: coreCurriculumCourses.map((name) => ({ name, passed: false })),
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

/** Grade-sheet columns that map onto a Student's own fields (graduated
 *  flag, scholarship note) rather than a real course - excluded from
 *  parseSemesterGrades.ts's course parsing so they don't become fake
 *  courses named "בוגר כן/לא"/"מלגה" in academicHistory, and from
 *  uncategorizedAcademicCourses below for the same reason. A record
 *  imported before this exclusion existed may still carry one of these as
 *  a stored "course" - this only stops it from being surfaced as one, it
 *  doesn't retroactively clean the stored data. */
export const NON_COURSE_COLUMN_NAMES = new Set(["בוגר כן/לא", "מלגה"]);

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
  // Grade sheets record an exemption (e.g. "פטור", "פטור מתואר ראשון") as
  // text rather than a number - real, recorded data that findGrade's numeric
  // check otherwise ignores forever, leaving an exempted course permanently
  // "missing" from the checklist. Matched narrowly (a "פטור"-prefixed grade
  // specifically) since real sheets carry plenty of OTHER non-numeric text
  // (e.g. "ממתין לציון", "לומד בסמסטר ב") that means the opposite - not yet
  // complete - and must stay unmatched.
  function findExemption(names: string[]): boolean {
    return allCourses.some(
      (c) => names.includes(c.name) && typeof c.grade === "string" && c.grade.trim().startsWith("פטור")
    );
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
          if (grade !== undefined) {
            Object.assign(patch, { grade, passed: true });
          } else if (findExemption(aliases)) {
            // No numeric grade to fill in for an exemption - just the
            // checkbox itself.
            Object.assign(patch, { passed: true });
          }
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

/** Course names that appear in a student's imported academicHistory but
 *  aren't reflected anywhere in their (already-synced - pass the output of
 *  syncCourseCategoriesFromHistory, not the raw stored categories) checklist
 *  - a coordinator's natural assumption is that importing grades fills in
 *  the checklist, but the "core"/"elective" categories have no fixed course
 *  list (see DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS's doc comment - which
 *  specific courses count is a per-student choice she has to make herself),
 *  so an imported elective/core-pool course sits in the raw history without
 *  ever being surfaced unless she notices and adds it by hand. Meant to
 *  drive a one-line hint on the card so that step isn't silently expected. */
export function uncategorizedAcademicCourses(
  categories: CourseCompletionCategory[],
  academicHistory: SemesterRecord[] | undefined
): string[] {
  if (!academicHistory || academicHistory.length === 0) return [];

  const known = new Set<string>();
  for (const category of categories) {
    for (const entry of category.entries) {
      known.add(entry.name);
      if (category.key === "core_curriculum") {
        const canonical = canonicalCoreCourseName(entry.name);
        known.add(canonical);
        for (const alias of DATA_SCIENCE_CORE_CURRICULUM_ALIASES[canonical] ?? []) known.add(alias);
      }
    }
  }

  const result: string[] = [];
  for (const c of academicHistory.flatMap((r) => r.courses)) {
    if (GENERIC_ELECTIVE_SLOT_NAMES.has(c.name) || NON_COURSE_COLUMN_NAMES.has(c.name)) continue;
    if (known.has(c.name) || result.includes(c.name)) continue;
    result.push(c.name);
  }
  return result;
}

export interface CoreCurriculumCourseRemoval {
  categories: CourseCompletionCategory[];
  /** A matching, ungraded entry was found and removed (requiredCount -1). */
  removed: boolean;
  /** A matching entry exists but already has a grade - left untouched, never
   *  silently dropped; the caller should surface this for manual handling. */
  skippedGraded: boolean;
}

/** Same effect as a coordinator manually exempting a student from one fixed
 *  core_curriculum course (see StudentCard.tsx's removeRow: removes the
 *  entry, requiredCount -1) - for bulk-correcting a course that was
 *  mistakenly added to the fixed catalog for some cohorts. Only removes an
 *  *ungraded* matching entry, so real recorded data is never silently
 *  discarded - a graded entry is reported via `skippedGraded` instead.
 *  "Graded" checks both the stored entry's own `grade` AND `academicHistory`
 *  (alias-aware, same lookup as syncCourseCategoriesFromHistory's findGrade)
 *  - a student's raw imported history can carry a real grade for this course
 *  before that grade has ever been synced into their stored courseCategories,
 *  and this must not treat that student as ungraded. Matches by
 *  canonicalCoreCourseName (alias-aware), since a stored entry can still
 *  carry an older cohort's name for the same course. Returns the original
 *  `categories` reference when nothing was removed. */
export function removeCoreCurriculumCourse(
  categories: CourseCompletionCategory[],
  courseName: string,
  academicHistory: SemesterRecord[] | undefined
): CoreCurriculumCourseRemoval {
  const canonical = canonicalCoreCourseName(courseName);
  const aliases = [canonical, ...(DATA_SCIENCE_CORE_CURRICULUM_ALIASES[canonical] ?? [])];
  const hasHistoryGrade = (academicHistory ?? []).some((r) =>
    r.courses.some((c) => aliases.includes(c.name) && typeof c.grade === "number")
  );
  let removedCount = 0;
  let skippedGraded = false;

  const next = categories.map((category) => {
    if (category.key !== "core_curriculum") return category;
    const entries = category.entries.filter((e) => {
      if (canonicalCoreCourseName(e.name) !== canonical) return true;
      if (e.grade !== undefined || hasHistoryGrade) {
        skippedGraded = true;
        return true;
      }
      removedCount++;
      return false;
    });
    if (removedCount === 0) return category;
    return { ...category, entries, requiredCount: category.requiredCount - removedCount };
  });

  return { categories: removedCount > 0 ? next : categories, removed: removedCount > 0, skippedGraded };
}

/** Overwrites a core_curriculum course's נ"ז credits (matching by
 *  canonicalCoreCourseName) - e.g. correcting a credit value that was wrong
 *  for a whole cohort. No-op (same `categories` reference, `changed: false`)
 *  if the student has no matching entry (e.g. already exempted) or it
 *  already holds this exact value. */
export function setCoreCurriculumCourseCredits(
  categories: CourseCompletionCategory[],
  courseName: string,
  credits: number
): { categories: CourseCompletionCategory[]; changed: boolean } {
  const canonical = canonicalCoreCourseName(courseName);
  let changed = false;

  const next = categories.map((category) => {
    if (category.key !== "core_curriculum") return category;
    const entries = category.entries.map((e) => {
      if (canonicalCoreCourseName(e.name) !== canonical || e.credits === credits) return e;
      changed = true;
      return { ...e, credits };
    });
    return changed ? { ...category, entries } : category;
  });

  return { categories: changed ? next : categories, changed };
}

/** Re-adds a core_curriculum course that's missing from a student's checklist
 *  but has a real recorded grade in academicHistory (alias-aware) - the
 *  inverse of removeCoreCurriculumCourse, for repairing a student who was
 *  wrongly exempted before that function's academicHistory check existed
 *  (or any similar mistake). No-op if the course is already present, or has
 *  no numeric grade in academicHistory. The restored entry is added as
 *  `passed: true`, matching syncCourseCategoriesFromHistory's convention for
 *  a history-sourced grade. */
export function restoreCoreCurriculumCourseFromHistory(
  categories: CourseCompletionCategory[],
  courseName: string,
  academicHistory: SemesterRecord[] | undefined
): { categories: CourseCompletionCategory[]; restored: boolean; grade?: number } {
  const canonical = canonicalCoreCourseName(courseName);
  const aliases = [canonical, ...(DATA_SCIENCE_CORE_CURRICULUM_ALIASES[canonical] ?? [])];
  const historyMatch = (academicHistory ?? [])
    .flatMap((r) => r.courses)
    .find((c) => aliases.includes(c.name) && typeof c.grade === "number");
  if (!historyMatch) return { categories, restored: false };

  const coreCurriculum = categories.find((c) => c.key === "core_curriculum");
  if (!coreCurriculum) return { categories, restored: false };
  if (coreCurriculum.entries.some((e) => canonicalCoreCourseName(e.name) === canonical)) {
    return { categories, restored: false };
  }

  const grade = historyMatch.grade as number;
  const next = categories.map((c) =>
    c.key === "core_curriculum"
      ? { ...c, requiredCount: c.requiredCount + 1, entries: [...c.entries, { name: canonical, grade, passed: true }] }
      : c
  );
  return { categories: next, restored: true, grade };
}

export interface CourseCategoryMove {
  categories: CourseCompletionCategory[];
  /** A matching entry was found in `fromKey` and moved to `toKey`. */
  moved: boolean;
}

/** Moves one existing course-completion entry from one category to another,
 *  preserving its grade/credits/passed exactly as recorded - unlike
 *  removeCoreCurriculumCourse, nothing is discarded here, so there's no
 *  grade-safety check to make: the entry's real data just relocates. Backs
 *  the curriculum-corrections page's category-reassignment tool, which
 *  bulk-applies a CurriculumCategoryRule to students who already have a
 *  stored entry for the moved course (a student created after the rule
 *  existed never has one to move, since dataScienceCoreCurriculumCourses
 *  already left it out of their core_curriculum catalog at creation time).
 *  Matches a core_curriculum entry alias-aware (canonicalCoreCourseName,
 *  same as removeCoreCurriculumCourse); a core/elective entry matches by
 *  exact name, since those categories have no catalog to canonicalize
 *  against. A no-op (`moved: false`, same `categories` reference) when no
 *  matching entry exists in `fromKey`. Mirrors StudentCard.tsx's removeRow:
 *  moving one of a fixed catalog's own required rows (index < requiredCount)
 *  lowers that category's requiredCount by one; an "extra" entry appended
 *  beyond it doesn't. The target category's requiredCount is never changed -
 *  core/elective's required course *count* is a fixed department policy
 *  (DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS), independent of how many entries
 *  happen to be typed in. */
export function moveCourseCategoryEntry(
  categories: CourseCompletionCategory[],
  courseName: string,
  fromKey: string,
  toKey: string
): CourseCategoryMove {
  const fromCategory = categories.find((c) => c.key === fromKey);
  if (!fromCategory) return { categories, moved: false };

  const isCoreCurriculum = fromKey === "core_curriculum";
  const canonical = isCoreCurriculum ? canonicalCoreCourseName(courseName) : courseName;
  const aliases = isCoreCurriculum ? [canonical, ...(DATA_SCIENCE_CORE_CURRICULUM_ALIASES[canonical] ?? [])] : [canonical];
  const matches = (name: string) => (isCoreCurriculum ? aliases.includes(canonicalCoreCourseName(name)) : name === canonical);

  const entryIndex = fromCategory.entries.findIndex((e) => matches(e.name));
  if (entryIndex === -1) return { categories, moved: false };

  const entry = fromCategory.entries[entryIndex];
  const isFixedSlot = fromCategory.fixedCatalog && entryIndex < fromCategory.requiredCount;
  const movedEntry = isCoreCurriculum ? { ...entry, name: canonical } : entry;

  const next = categories.map((c) => {
    if (c.key === fromKey) {
      return {
        ...c,
        entries: c.entries.filter((_, i) => i !== entryIndex),
        requiredCount: isFixedSlot ? c.requiredCount - 1 : c.requiredCount,
      };
    }
    if (c.key === toKey) {
      return { ...c, entries: [...c.entries, movedEntry] };
    }
    return c;
  });

  return { categories: next, moved: true };
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
