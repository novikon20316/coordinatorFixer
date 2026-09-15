"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Faculty,
  FACULTY_VALUES,
  HEBREW_YEAR_VALUES,
  he,
  Student,
  STUDENT_TRACK_VALUES,
  StudentStatus,
  StudentTrack,
} from "@admin-coordinator/shared";
import { subscribeStudents } from "../../../data/studentsRepository";
import { useFaculty } from "../../../context/FacultyContext";
import { StatusChangeModal } from "../../../components/StatusChangeModal";

/**
 * Filters + a list of students, with a click-to-change status action (any
 * role). A richer track-transition flow (e.g. what else should happen when
 * a student moves off בהשלמה) is still being decided - see
 * web/src/lib/completionCourses.ts's doc comment for how that's expected to
 * affect the dashboard once it exists; for now this only ever changes
 * `status` directly.
 */
export default function ChangeStatusPage() {
  const { faculty, setFaculty, canChangeFaculty } = useFaculty();
  const [students, setStudents] = useState<Student[]>([]);
  const [trackFilter, setTrackFilter] = useState<StudentTrack | "">("");
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);

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

  function handleStatusChange(studentId: string, status: StudentStatus) {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, status } : s)));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{he.changeStatus.title}</h1>

      <div className="flex flex-wrap items-center gap-3">
        {canChangeFaculty && (
          <select
            value={faculty}
            onChange={(e) => setFaculty(e.target.value as Faculty)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {FACULTY_VALUES.map((f) => (
              <option key={f} value={f}>
                {he.faculty[f]}
              </option>
            ))}
          </select>
        )}
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

      <p className="text-xs text-gray-500">{he.changeStatus.clickToChange}</p>

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
              <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer hover:bg-gray-50">
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

      {selected && (
        <StatusChangeModal student={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
