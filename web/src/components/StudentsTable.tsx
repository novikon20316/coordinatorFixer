"use client";

import { he, Student, StudentStatus } from "@admin-coordinator/shared";

const STATUS_STYLES: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "bg-green-100 text-green-800",
  [StudentStatus.REGISTERED]: "bg-blue-100 text-blue-800",
  [StudentStatus.REJECTED]: "bg-red-100 text-red-800",
  [StudentStatus.CANCELED]: "bg-gray-200 text-gray-700",
};

export function StudentsTable({ students }: { students: Student[] }) {
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 py-16 text-center text-gray-500">
        {he.common.noData}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[900px] text-right text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 font-semibold">{he.table.columns.fullName}</th>
            <th className="px-4 py-3 font-semibold">{he.table.columns.previousCollege}</th>
            <th className="px-4 py-3 font-semibold">{he.table.columns.degreeField}</th>
            <th className="px-4 py-3 font-semibold">{he.table.columns.degreeType}</th>
            <th className="px-4 py-3 font-semibold">{he.table.columns.gpa}</th>
            <th className="px-4 py-3 font-semibold">{he.table.columns.background}</th>
            <th className="px-4 py-3 font-semibold">{he.table.columns.status}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{s.fullName}</td>
              <td className="px-4 py-3 text-gray-700">{s.previousCollege}</td>
              <td className="px-4 py-3 text-gray-700">{s.degreeField}</td>
              <td className="px-4 py-3 text-gray-700">{he.degreeType[s.degreeType]}</td>
              <td className="px-4 py-3 text-gray-700">{s.gpa}</td>
              <td className="px-4 py-3 text-gray-700">{s.background}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[s.status]}`}
                >
                  {he.status[s.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
