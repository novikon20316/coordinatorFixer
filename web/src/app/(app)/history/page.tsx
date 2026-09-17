"use client";

import { useEffect, useMemo, useState } from "react";
import { he, Student } from "@admin-coordinator/shared";
import { subscribeStudents } from "../../../data/studentsRepository";
import { useFaculty } from "../../../context/FacultyContext";
import {
  buildCourseHistory,
  CourseHistoryCourse,
  CourseHistoryGroup,
  groupCoursesByName,
  updateGroupLecturer,
} from "../../../lib/history";
import { CourseDetailModal } from "../../../components/CourseDetailModal";
import { CourseOfferingsModal } from "../../../components/CourseOfferingsModal";

export default function HistoryPage() {
  const { faculty } = useFaculty();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CourseHistoryCourse | null>(null);
  const [selected, setSelected] = useState<CourseHistoryGroup | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeStudents(faculty, setStudents);
    return unsubscribe;
  }, [faculty]);

  const groups = useMemo(() => buildCourseHistory(students), [students]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) => g.courseName.toLowerCase().includes(q) || (g.lecturer ?? "").toLowerCase().includes(q)
    );
  }, [groups, search]);

  const courses = useMemo(() => groupCoursesByName(filteredGroups), [filteredGroups]);

  async function handleLecturerChange(group: CourseHistoryGroup, lecturer: string) {
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
              <th className="px-4 py-2 text-right font-medium">{he.history.offeringsCount}</th>
              <th className="px-4 py-2 text-right font-medium">{he.history.studentsCount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map((c) => (
              <tr key={c.courseName} onClick={() => setSelectedCourse(c)} className="cursor-pointer hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{c.courseName}</td>
                <td className="px-4 py-2 text-gray-600">{c.offerings.length}</td>
                <td className="px-4 py-2 text-gray-600">{c.studentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {courses.length === 0 && <div className="py-16 text-center text-gray-500">{he.history.noHistory}</div>}
      </div>

      {selectedCourse && !selected && (
        <CourseOfferingsModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onSelectOffering={setSelected}
        />
      )}

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
