"use client";

import { he } from "@admin-coordinator/shared";
import { CourseHistoryCourse, CourseHistoryGroup } from "../lib/history";

/** One course's list of מחזור/semester offerings, opened by clicking a
 *  course name in the History tab - a coordinator picks an offering here to
 *  drill into its student list (CourseDetailModal). */
export function CourseOfferingsModal({
  course,
  onClose,
  onSelectOffering,
}: {
  course: CourseHistoryCourse;
  onClose: () => void;
  onSelectOffering: (group: CourseHistoryGroup) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{course.courseName}</h2>
          {course.lecturer && <p className="text-sm text-gray-600">{course.lecturer}</p>}
          <p className="text-xs text-gray-500">{he.history.courseOfferingsTitle}</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-right font-medium">{he.history.cohortYear}</th>
                <th className="px-3 py-2 text-right font-medium">{he.history.semester}</th>
                <th className="px-3 py-2 text-right font-medium">{he.history.lecturer}</th>
                <th className="px-3 py-2 text-right font-medium">{he.history.studentsCount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {course.offerings.map((offering) => (
                <tr
                  key={offering.key}
                  onClick={() => onSelectOffering(offering)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-gray-900">{offering.hebrewYear}</td>
                  <td className="px-3 py-2 text-gray-600">{he.studentCard.semesterLabel[offering.semester]}</td>
                  <td className="px-3 py-2 text-gray-600">{offering.lecturer || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{offering.entries.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {he.history.close}
          </button>
        </div>
      </div>
    </div>
  );
}
