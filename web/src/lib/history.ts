import { HebrewYear, Student } from "@admin-coordinator/shared";
import { apiFetch } from "./apiClient";

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
