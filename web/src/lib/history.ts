import { GENERIC_ELECTIVE_SLOT_NAMES, HEBREW_YEAR_VALUES, HebrewYear, Student } from "@admin-coordinator/shared";
import { apiFetch } from "./apiClient";

// These aren't real courses - they're sheet columns ("did they graduate?",
// "scholarship amount", a ליבה/בחירה slot with no course name yet assigned)
// that older imports mistakenly recorded into academicHistory as if they
// were named courses (see lib/import/parseSemesterGrades.ts's
// IGNORED_COLUMNS, which now keeps new imports from doing this). Filtered
// out here too so already-imported records carrying them don't need a data
// migration to disappear from the History tab.
const NOT_REAL_COURSES = new Set(["בוגר כן/לא", "מלגה", ...GENERIC_ELECTIVE_SLOT_NAMES]);

/** One student's grade within a CourseHistoryGroup below. */
export interface CourseHistoryEntry {
  studentId: string;
  studentName: string;
  grade?: number | string;
}

/**
 * One (course, cohort year, semester) "class" - everyone who took the same
 * course in the same semester of the same מחזור, aggregated across all
 * students' academicHistory so the History tab can show one row per class
 * (with a single lecturer) instead of one row per student per course.
 */
export interface CourseHistoryGroup {
  key: string;
  courseName: string;
  hebrewYear: HebrewYear;
  semester: "A" | "B";
  lecturer?: string;
  entries: CourseHistoryEntry[];
}

/** Builds the full course catalog for the History tab out of every
 *  student's imported academicHistory. Pure/read-only, same spirit as
 *  syncCourseCategoriesFromHistory - nothing is written just from viewing
 *  the list. */
export function buildCourseHistory(students: Student[]): CourseHistoryGroup[] {
  const groups = new Map<string, CourseHistoryGroup>();

  for (const student of students) {
    for (const record of student.academicHistory ?? []) {
      for (const course of record.courses) {
        if (NOT_REAL_COURSES.has(course.name)) continue;
        const key = `${course.name}|${record.hebrewYear}|${record.semester}`;
        let group = groups.get(key);
        if (!group) {
          group = {
            key,
            courseName: course.name,
            hebrewYear: record.hebrewYear,
            semester: record.semester,
            lecturer: course.lecturer,
            entries: [],
          };
          groups.set(key, group);
        } else if (!group.lecturer && course.lecturer) {
          group.lecturer = course.lecturer;
        }
        group.entries.push({ studentId: student.id, studentName: student.fullName, grade: course.grade });
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.courseName.localeCompare(b.courseName, "he"));
}

/** One course name as taught by one lecturer, folding together every
 *  מחזור/semester it was actually taught in (its CourseHistoryGroup
 *  "classes") - a coordinator drills into a specific offering to see who
 *  took it. A course name taught by more than one lecturer over the years
 *  splits into a separate CourseHistoryCourse per lecturer (see
 *  groupCoursesByName) rather than merging them into one row, since they're
 *  effectively different classes that happen to share a name. */
export interface CourseHistoryCourse {
  courseName: string;
  lecturer?: string;
  offerings: CourseHistoryGroup[];
  studentCount: number;
}

const SEMESTER_ORDER: Record<"A" | "B", number> = { A: 0, B: 1 };

/** Folds the flat (course, cohort year, semester) class list from
 *  buildCourseHistory into one entry per (course name, lecturer) pair, most
 *  recent offering first. Splitting on lecturer as well as name means a
 *  course taught by two different lecturers across its history shows as two
 *  separate rows in the History tab instead of one row with both names. */
export function groupCoursesByName(groups: CourseHistoryGroup[]): CourseHistoryCourse[] {
  const byKey = new Map<string, CourseHistoryGroup[]>();
  for (const group of groups) {
    const key = `${group.courseName}|${group.lecturer ?? ""}`;
    const offerings = byKey.get(key);
    if (offerings) offerings.push(group);
    else byKey.set(key, [group]);
  }

  return Array.from(byKey.values())
    .map((offerings) => ({
      courseName: offerings[0].courseName,
      lecturer: offerings[0].lecturer,
      offerings: [...offerings].sort((a, b) => {
        const yearDiff = HEBREW_YEAR_VALUES.indexOf(b.hebrewYear) - HEBREW_YEAR_VALUES.indexOf(a.hebrewYear);
        return yearDiff !== 0 ? yearDiff : SEMESTER_ORDER[b.semester] - SEMESTER_ORDER[a.semester];
      }),
      studentCount: offerings.reduce((sum, o) => sum + o.entries.length, 0),
    }))
    .sort((a, b) => {
      const nameDiff = a.courseName.localeCompare(b.courseName, "he");
      return nameDiff !== 0 ? nameDiff : (a.lecturer ?? "").localeCompare(b.lecturer ?? "", "he");
    });
}

/**
 * Sets the lecturer for every student's matching course entry within one
 * class (same course/cohort/semester) at once - the coordinator only has to
 * type a lecturer's name once per class, not once per enrolled student.
 */
export async function updateGroupLecturer(
  students: Student[],
  group: Pick<CourseHistoryGroup, "courseName" | "hebrewYear" | "semester">,
  lecturer: string
): Promise<void> {
  const affected = students.filter((s) =>
    (s.academicHistory ?? []).some(
      (r) =>
        r.hebrewYear === group.hebrewYear &&
        r.semester === group.semester &&
        r.courses.some((c) => c.name === group.courseName)
    )
  );

  await Promise.all(
    affected.map((s) => {
      const academicHistory = (s.academicHistory ?? []).map((r) => {
        if (r.hebrewYear !== group.hebrewYear || r.semester !== group.semester) return r;
        return {
          ...r,
          courses: r.courses.map((c) => (c.name === group.courseName ? { ...c, lecturer } : c)),
        };
      });
      return apiFetch(`/api/students/${s.id}`, { method: "PATCH", body: JSON.stringify({ academicHistory }) });
    })
  );
}
