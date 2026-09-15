import { Faculty } from "../constants/status";
import {
  DATA_SCIENCE_CORE_CURRICULUM_ALIASES,
  DATA_SCIENCE_CORE_CURRICULUM_COURSES,
  DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS,
  DATA_SCIENCE_PROJECT_MILESTONES,
} from "../constants/dataScienceCurriculum";
import { HebrewYear, yearOfStudy } from "../constants/hebrewYear";
import { he } from "../i18n/he";
import { CourseCompletionCategory, CourseCompletionEntry, MilestoneProgress, SemesterRecord } from "../types/student";

/** Builds a fresh course-completion checklist for a newly created student.
 *  Only Data Science has a known catalog today (see dataScienceCurriculum.ts)
 *  - other faculties get no categories, same as before this feature existed. */
export function buildDefaultCourseCategories(faculty: Faculty): CourseCompletionCategory[] {
  if (faculty !== Faculty.DATA_SCIENCE) return [];
  return [
    {
      key: "core_curriculum",
      label: "מקצועות חובה של המחלקה",
      fixedCatalog: true,
      requiredCount: DATA_SCIENCE_CORE_CURRICULUM_COURSES.length,
      entries: DATA_SCIENCE_CORE_CURRICULUM_COURSES.map((name) => ({ name, passed: false })),
    },
    {
      key: "core",
      label: "קורסי ליבה",
      fixedCatalog: false,
      requiredCount: DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS.core.requiredCount,
      requiredCredits: DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS.core.requiredCredits,
      entries: [],
    },
    {
      key: "elective",
      label: "קורסי בחירה",
      fixedCatalog: false,
      requiredCount: DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS.elective.requiredCount,
      requiredCredits: DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS.elective.requiredCredits,
      entries: [],
    },
  ];
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
 *   skipping names already present so re-running this is idempotent.
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
