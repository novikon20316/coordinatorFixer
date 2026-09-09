import { Faculty } from "../constants/status";
import {
  DATA_SCIENCE_CORE_CURRICULUM_COURSES,
  DATA_SCIENCE_CORE_ELECTIVE_REQUIREMENTS,
  DATA_SCIENCE_PROJECT_MILESTONES,
} from "../constants/dataScienceCurriculum";
import { CourseCompletionCategory, MilestoneProgress } from "../types/student";

/** Builds a fresh course-completion checklist for a newly created student.
 *  Only Data Science has a known catalog today (see dataScienceCurriculum.ts)
 *  - other faculties get no categories, same as before this feature existed. */
export function buildDefaultCourseCategories(faculty: Faculty): CourseCompletionCategory[] {
  if (faculty !== Faculty.DATA_SCIENCE) return [];
  return [
    {
      key: "core_curriculum",
      label: "מקצועות ליבה של המחלקה",
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
