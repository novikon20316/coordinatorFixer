/**
 * Data Science department curriculum, used to build each student's course-
 * completion checklist and project milestone checklist on their dashboard
 * card. Provided directly by the coordinator (2026-09) - not sourced from
 * organization-all-system's Firestore (no credentials for that project from
 * here), but the milestone list below mirrors that system's own maintained
 * data_science/msc_project workflow template (see
 * organization-all-system/server/src/scripts/seedDataScienceWorkflowTemplate.ts's
 * MILESTONES array - הצעת מחקר / דו"ח התקדמות / בחינת הגנה / פוסטר, in that
 * order) so the two systems describe the same real process.
 *
 * Only Data Science is modeled today, matching this dashboard's existing
 * CURRENT_FACULTY scoping (see web/src/app/(app)/dashboard/page.tsx) - there
 * is no fixed catalog for other faculties yet.
 *
 * Note: organization-all-system's MASTERS_TRACK_POLICY (web/lib/studentTrack.ts)
 * has no entry for the data_science major, which makes its resolveTrackPolicy
 * default to 'project_only' - i.e. that system currently has no thesis path
 * for Data Science, only a project path. Only the project milestones are
 * modeled here as a result; if a thesis path is added there later, add its
 * milestone list here too.
 */

import { HebrewYear } from "./hebrewYear";

/** The department's 7 required core-curriculum courses (fixed catalog,
 *  checkbox-style), in Hebrew - matches the course names as the department's
 *  own grade sheets report them (see shared/src/utils/studentDefaults.ts's
 *  syncCourseCategoriesFromHistory, which reads a student's imported
 *  academicHistory and fills these entries' grades in automatically). */
export const DATA_SCIENCE_CORE_CURRICULUM_COURSES: string[] = [
  "למידת מכונה",
  "שיטות סטטיסטיות",
  "מתמטיקה למדעי הנתונים",
  "ניהול והנדסת תשתיות נתוני עתק בענן",
  "עיבוד שפה טבעית",
  "למידה עמוקה",
  "למידה סטטיסטית",
];

/**
 * Alternate spellings for each core-curriculum course, observed across
 * different cohorts'/years' grade sheets (curriculum naming drifted a bit
 * over time - e.g. the תשפ"ג cohort's sheet calls the same requirement
 * "שיטות הסתברויות" instead of "שיטות סטטיסטיות") plus this catalog's old
 * English names (courses created before 2026-09 have these baked into their
 * stored courseCategories) - used only for matching, never for display.
 * Keyed by the canonical Hebrew name above.
 */
export const DATA_SCIENCE_CORE_CURRICULUM_ALIASES: Record<string, string[]> = {
  "למידת מכונה": ["Machine Learning"],
  "שיטות סטטיסטיות": ["שיטות הסתברויות", "Statistical Methods"],
  "מתמטיקה למדעי הנתונים": ["Mathematics for Data Science"],
  "ניהול והנדסת תשתיות נתוני עתק בענן": ["Cloud-Based Big Data Infrastructure Management and Engineering"],
  "עיבוד שפה טבעית": ["Natural Language Processing"],
  "למידה עמוקה": ["Deep Learning"],
  "למידה סטטיסטית": ["למידה סטיסטית", "Statistical Learning"],
};

/** Resolves any known alternate spelling of a core-curriculum course (see
 *  DATA_SCIENCE_CORE_CURRICULUM_ALIASES) back to its canonical Hebrew name -
 *  a name with no known canonical/alias match is returned as-is. */
export function canonicalCoreCourseName(name: string): string {
  if (DATA_SCIENCE_CORE_CURRICULUM_COURSES.includes(name)) return name;
  const canonical = Object.keys(DATA_SCIENCE_CORE_CURRICULUM_ALIASES).find((c) =>
    DATA_SCIENCE_CORE_CURRICULUM_ALIASES[c].includes(name)
  );
  return canonical ?? name;
}

/**
 * The other two graduation requirements, on top of the core curriculum above.
 * Their actual course lists vary by year/college and aren't a fixed catalog
 * (per the coordinator) - only their target course count is fixed (their
 * minimum credit total instead varies by cohort year - see
 * DATA_SCIENCE_CREDIT_REQUIREMENTS below); coordinators type in the specific
 * courses a student took.
 */
export const DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS = {
  core: { requiredCount: 2 },
  elective: { requiredCount: 3 },
} as const;

/** Minimum נ"ז totals for each of the three course-completion categories,
 *  which the coordinator changed starting the תשפ"ו cohort (2026-09) - a
 *  cohort's target follows whichever curriculum was in force when they
 *  started, for as long as they're enrolled, not whatever is current now. */
export interface DataScienceCreditRequirements {
  core_curriculum: number;
  core: number;
  elective: number;
}

const DATA_SCIENCE_CREDIT_REQUIREMENTS_LEGACY: DataScienceCreditRequirements = {
  core_curriculum: 20.5,
  core: 9,
  elective: 9,
};

const DATA_SCIENCE_CREDIT_REQUIREMENTS_CURRENT: DataScienceCreditRequirements = {
  core_curriculum: 23,
  core: 6,
  elective: 9,
};

/** Cohorts still following the pre-תשפ"ו credit totals. */
const DATA_SCIENCE_LEGACY_CREDIT_COHORTS: HebrewYear[] = ["תשפג", "תשפד", "תשפה"];

/** The credit-requirement set that applies to a student who started in
 *  `cohortYear` - undefined (a student with no cohort year set yet) gets the
 *  current curriculum, same as any cohort from תשפ"ו onward. */
export function dataScienceCreditRequirements(cohortYear: HebrewYear | undefined): DataScienceCreditRequirements {
  return cohortYear && DATA_SCIENCE_LEGACY_CREDIT_COHORTS.includes(cohortYear)
    ? DATA_SCIENCE_CREDIT_REQUIREMENTS_LEGACY
    : DATA_SCIENCE_CREDIT_REQUIREMENTS_CURRENT;
}

/** The msc_project process's milestones for Data Science, in order. */
export const DATA_SCIENCE_PROJECT_MILESTONES: { key: string; nameHe: string; nameEn: string }[] = [
  { key: "research_proposal", nameHe: "הצעת מחקר", nameEn: "Research Proposal" },
  { key: "progress_report", nameHe: "דו\"ח התקדמות", nameEn: "Progress Report" },
  { key: "defense", nameHe: "בחינת הגנה", nameEn: "Defense Exam" },
  { key: "poster", nameHe: "פוסטר", nameEn: "Poster Session" },
];
