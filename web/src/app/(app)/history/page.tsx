"use client";

import { useEffect, useMemo, useState } from "react";
import { he, Student } from "@admin-coordinator/shared";
import { subscribeStudents } from "../../../data/studentsRepository";
import { useFaculty } from "../../../context/FacultyContext";
import { buildCourseHistory, CourseHistoryGroup, updateGroupLecturer } from "../../../lib/history";
import { CourseDetailModal } from "../../../components/CourseDetailModal";

export default function HistoryPage() {
  const { faculty } = useFaculty();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CourseHistoryGroup | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeStudents(faculty, setStudents);
    return unsubscribe;
  }, [faculty]);

  const groups = useMemo(() => buildCourseHistory(students), [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.courseName.toLowerCase().includes(q) || (g.lecturer ?? "").toLowerCase().includes(q)
    );
  }, [groups, search]);

  async function handleLecturerChange(group: CourseHistoryGroup, lecturer: string) {
    setSelected((prev) => (prev && prev.key === group.key ? { ...prev, lecturer } : prev));
    await updateGroupLecturer(students, group, lecturer);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{he.history.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{he.history.description}</p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={he.dashboard.searchPlaceholder}
        className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-right font-medium">{he.history.courseName}</th>
              <th className="px-4 py-2 text-right font-medium">{he.history.cohortYear}</th>
              <th className="px-4 py-2 text-right font-medium">{he.history.semester}</th>
              <th className="px-4 py-2 text-right font-medium">{he.history.lecturer}</th>
              <th className="px-4 py-2 text-right font-medium">{he.history.studentsCount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((g) => (
              <tr key={g.key} onClick={() => setSelected(g)} className="cursor-pointer hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{g.courseName}</td>
                <td className="px-4 py-2 text-gray-600">{g.hebrewYear}</td>
                <td className="px-4 py-2 text-gray-600">{he.studentCard.semesterLabel[g.semester]}</td>
                <td className="px-4 py-2 text-gray-600" onClick={(e) => e.stopPropagation()}>
                  <input
                    defaultValue={g.lecturer ?? ""}
                    onBlur={(e) => handleLecturerChange(g, e.target.value)}
                    placeholder={he.history.lecturerPlaceholder}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2 text-gray-600">{g.entries.length}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && <div className="py-16 text-center text-gray-500">{he.history.noHistory}</div>}
      </div>

      {selected && (
        <CourseDetailModal
          group={selected}
          onClose={() => setSelected(null)}
          onLecturerChange={(lecturer) => handleLecturerChange(selected, lecturer)}
        />
      )}
    </div>
  );
}
