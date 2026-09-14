"use client";

import { useState } from "react";
import { he } from "@admin-coordinator/shared";
import { CourseHistoryGroup } from "../lib/history";

/** Details for one class (course + cohort + semester) opened from the
 *  History tab - who took it, what they got, and who taught it. */
export function CourseDetailModal({
  group,
  onClose,
  onLecturerChange,
}: {
  group: CourseHistoryGroup;
  onClose: () => void;
  onLecturerChange: (lecturer: string) => void;
}) {
  const [lecturer, setLecturer] = useState(group.lecturer ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{group.courseName}</h2>
          <p className="text-xs text-gray-500">
            {he.history.courseDetailTitle} · {group.hebrewYear} · {he.studentCard.semesterLabel[group.semester]}
          </p>
        </div>

        <label className="mb-4 flex flex-col gap-1 text-xs text-gray-600">
          {he.history.lecturer}
          <input
            value={lecturer}
            onChange={(e) => setLecturer(e.target.value)}
            onBlur={() => onLecturerChange(lecturer)}
            placeholder={he.history.lecturerPlaceholder}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-right font-medium">{he.history.studentName}</th>
                <th className="px-3 py-2 text-right font-medium">{he.history.grade}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {group.entries.map((entry) => (
                <tr key={entry.studentId}>
                  <td className="px-3 py-2 text-gray-900">{entry.studentName}</td>
                  <td className="px-3 py-2 text-gray-600">{entry.grade ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {he.history.close}
          </button>
        </div>
      </div>
    </div>
  );
}
