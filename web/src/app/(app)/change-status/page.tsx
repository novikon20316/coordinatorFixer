"use client";

import { useEffect, useMemo, useState } from "react";
import { HEBREW_YEAR_VALUES, he, Student, STUDENT_TRACK_VALUES, StudentTrack } from "@admin-coordinator/shared";
import { subscribeStudents } from "../../../data/studentsRepository";
import { useFaculty } from "../../../context/FacultyContext";

/**
 * Filters + a plain list of students - the actual status/track-change
 * action (see the coordinator's plan: moving a student from "בהשלמה" to
 * "מן המניין" once they finish their השלמות) is intentionally not built
 * yet; its exact flow is still being decided. Once it exists, this page's
 * list is where it'll live - see web/src/lib/completionCourses.ts's doc
 * comment for how that change is expected to affect the dashboard.
 */
export default function ChangeStatusPage() {
  const { faculty } = useFaculty();
  const [students, setStudents] = useState<Student[]>([]);
  const [trackFilter, setTrackFilter] = useState<StudentTrack | "">("");
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeStudents(faculty, setStudents);
    return unsubscribe;
  }, [faculty]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => !trackFilter || s.track === trackFilter)
      .filter((s) => !cohortFilter || s.cohortYear === cohortFilter)
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.idNumber?.toLowerCase().includes(q))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "he"));
  }, [students, trackFilter, cohortFilter, search]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{he.changeStatus.title}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value as StudentTrack | "")}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{he.changeStatus.trackFilterAll}</option>
          {STUDENT_TRACK_VALUES.map((t) => (
            <option key={t} value={t}>
              {he.dashboard.tabs[t]}
            </option>
          ))}
        </select>
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{he.dashboard.cohortFilterAll}</option>
          {HEBREW_YEAR_VALUES.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={he.dashboard.searchPlaceholder}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-right font-medium">{he.table.columns.fullName}</th>
              <th className="px-4 py-2 text-right font-medium">{he.table.columns.idNumber}</th>
              <th className="px-4 py-2 text-right font-medium">{he.table.columns.cohortYear}</th>
              <th className="px-4 py-2 text-right font-medium">{he.studentForm.track}</th>
              <th className="px-4 py-2 text-right font-medium">{he.table.columns.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{s.fullName}</td>
                <td className="px-4 py-2 text-gray-600" dir="ltr">
                  {s.idNumber || "—"}
                </td>
                <td className="px-4 py-2 text-gray-600">{s.cohortYear || "—"}</td>
                <td className="px-4 py-2 text-gray-600">{he.dashboard.tabs[s.track]}</td>
                <td className="px-4 py-2 text-gray-600">{he.status[s.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && <div className="py-16 text-center text-gray-500">{he.common.noData}</div>}
      </div>

      <p className="text-sm text-gray-500">{he.changeStatus.comingSoon}</p>
    </div>
  );
}
