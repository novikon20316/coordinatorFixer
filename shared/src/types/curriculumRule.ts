import { Faculty } from "../constants/status";
import { HebrewYear } from "../constants/hebrewYear";

/** The three course-completion category keys that exist today (see
 *  CourseCompletionCategory.key in types/student.ts) - kept as a real union
 *  here (unlike CourseCompletionCategory.key's plain string) so a
 *  reclassification rule can only ever reference a category that actually
 *  exists. */
export type CourseCategoryKey = "core_curriculum" | "core" | "elective";

/**
 * A standing decision that a named course belongs to a different graduation
 * category than the department's default catalog says, starting from a given
 * מחזור onward - earlier cohorts keep the original classification for as
 * long as they're enrolled, same "whichever curriculum was in force when they
 * started" rule as dataScienceCreditRequirements. Admin-managed from the
 * תיקוני תוכנית לימודים page: creating one both (a) makes
 * dataScienceCoreCurriculumCourses exclude the course from the fixed catalog
 * for any cohort from `effectiveFromCohort` onward (so a student created
 * later starts with the right checklist), and (b) the admin tool bulk-moves
 * the matching entry (see moveCourseCategoryEntry) on any already-existing
 * student in an affected cohort who has one.
 *
 * Moving a course INTO core_curriculum isn't supported - that category's
 * whole meaning is "the department's fixed catalog," and a course reassigned
 * here didn't newly become one of the department's core requirements.
 */
export interface CurriculumCategoryRule {
  id: string;
  faculty: Faculty;
  course: string;
  fromCategory: CourseCategoryKey;
  toCategory: Exclude<CourseCategoryKey, "core_curriculum">;
  effectiveFromCohort: HebrewYear;
  createdAt: string;
}

export type CurriculumCategoryRuleCreateInput = Omit<CurriculumCategoryRule, "id" | "createdAt">;
