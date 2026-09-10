"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  buildDefaultCourseCategories,
  cohortNumber,
  he,
  HEBREW_YEAR_VALUES,
  HebrewYear,
  Student,
  StudentTrack,
  syncCourseCategoriesFromHistory,
} from "@admin-coordinator/shared";
import { subscribeStudents } from "../../../data/studentsRepository";
import { useFaculty } from "../../../context/FacultyContext";

function buildReportRow(student: Student) {
  const categories = syncCourseCategoriesFromHistory(
    student.courseCategories ?? buildDefaultCourseCategories(student.faculty),
    student.academicHistory
  );
  const coreCurriculum = categories.find((c) => c.key === "core_curriculum");
  const passedCount = coreCurriculum?.entries.filter((e) => e.passed).length ?? 0;
  const totalCount = coreCurriculum?.requiredCount ?? 0;

  return {
    [he.table.columns.fullName]: student.fullName,
    [he.table.columns.idNumber]: student.idNumber || "",
    [he.reports.columns.cohortLabel]: student.cohortYear ?? "",
    [he.reports.columns.track]: he.dashboard.tabs[student.track],
    [he.reports.columns.status]: he.status[student.status],
    [he.reports.columns.wasEverCompletion]:
      student.wasEverCompletion || student.track === StudentTrack.COMPLETION ? he.reports.yes : he.reports.no,
    [he.reports.columns.coreCurriculumProgress]: `${passedCount}/${totalCount}`,
    [he.reports.columns.finalGrade]: student.finalGrade ?? "",
    [he.reports.columns.projectTitle]: student.projectTitle ?? "",
    [he.reports.columns.supervisorName]: student.supervisorName ?? "",
  };
}

export default function ReportsPage() {
  const { faculty } = useFaculty();
  const [students, setStudents] = useState<Student[]>([]);
  const [cohort, setCohort] = useState<HebrewYear>(HEBREW_YEAR_VALUES[0]);

  useEffect(() => {
    const unsubscribe = subscribeStudents(faculty, setStudents);
    return unsubscribe;
  }, [faculty]);

  const cohortStudents = useMemo(() => students.filter((s) => s.cohortYear === cohort), [students, cohort]);

  function handleDownload() {
    const rows = cohortStudents.map(buildReportRow);
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, he.reports.balanceReportTitle);
    XLSX.writeFile(workbook, `מאזן חובות מחזור ${cohortNumber(cohort)}.xlsx`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{he.reports.title}</h1>

      <section className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4">
        <div>
          <h2 className="font-semibold text-gray-900">{he.reports.balanceReportTitle}</h2>
          <p className="text-sm text-gray-500">{he.reports.balanceReportDescription}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {he.reports.cohortLabel}
            <select
              value={cohort}
              onChange={(e) => setCohort(e.target.value as HebrewYear)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {HEBREW_YEAR_VALUES.map((y) => (
                <option key={y} value={y}>
                  {he.reports.cohortLabel} {cohortNumber(y)} ({y})
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={handleDownload}
            disabled={cohortStudents.length === 0}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {he.reports.download}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {cohortStudents.length === 0 ? he.reports.noStudents : `${cohortStudents.length} תלמידים במחזור זה`}
        </p>
      </section>
    </div>
  );
}
