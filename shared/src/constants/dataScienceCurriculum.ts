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

/** The department's 7 required core-curriculum courses (fixed catalog, checkbox-style). */
export const DATA_SCIENCE_CORE_CURRICULUM_COURSES: string[] = [
  "Machine Learning",
  "Statistical Methods",
  "Mathematics for Data Science",
  "Cloud-Based Big Data Infrastructure Management and Engineering",
  "Natural Language Processing",
  "Deep Learning",
  "Statistical Learning",
];

/**
 * The other two graduation requirements, on top of the core curriculum above.
 * Their actual course lists vary by year/college and aren't a fixed catalog
 * (per the coordinator) - only their target course count and minimum credit
 * total are fixed; coordinators type in the specific courses a student took.
 */
export const DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS = {
  core: { requiredCount: 2, requiredCredits: 6 },
  elective: { requiredCount: 3, requiredCredits: 9 },
} as const;

/** The msc_project process's milestones for Data Science, in order. */
export const DATA_SCIENCE_PROJECT_MILESTONES: { key: string; nameHe: string; nameEn: string }[] = [
  { key: "research_proposal", nameHe: "הצעת מחקר", nameEn: "Research Proposal" },
  { key: "progress_report", nameHe: "דו\"ח התקדמות", nameEn: "Progress Report" },
  { key: "defense", nameHe: "בחינת הגנה", nameEn: "Defense Exam" },
  { key: "poster", nameHe: "פוסטר", nameEn: "Poster Session" },
];
