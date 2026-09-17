"use client";

import { useState } from "react";
import {
  cohortYearOptionLabel,
  CURRENT_HEBREW_YEAR,
  he,
  HEBREW_YEAR_VALUES,
  HebrewYear,
  isGraduatedStatus,
  Student,
  STUDENT_STATUS_VALUES,
  StudentStatus,
} from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

export type StatusUpdate = { status: StudentStatus; graduationYear?: HebrewYear };

/**
 * Lets any role (admin or coordinator) set a student's status directly from
 * the שינוי סטטוס list. Also asks for the Hebrew year they actually
 * finished whenever the new status is one of the two graduated ones (see
 * isGraduatedStatus) - the dashboard's graduates tab needs the real
 * graduation year, not just the fact that it happened. PATCHes `status` and,
 * when graduated, `graduationYear`.
 */
export function StatusChangeModal({
  student,
  onClose,
  onStatusChange,
}: {
  student: Student;
  onClose: () => void;
  /** Applied immediately so the row updates without waiting on the PATCH
   *  round trip; called again with the previous values if the PATCH fails. */
  onStatusChange: (studentId: string, update: StatusUpdate) => void;
}) {
  const [status, setStatus] = useState<StudentStatus>(student.status);
  const [graduationYear, setGraduationYear] = useState<HebrewYear>(
    student.graduationYear ?? student.cohortYear ?? CURRENT_HEBREW_YEAR
  );

  function handleSave() {
    const previous: StatusUpdate = { status: student.status, graduationYear: student.graduationYear };
    const update: StatusUpdate = { status, graduationYear: isGraduatedStatus(status) ? graduationYear : undefined };
    onStatusChange(student.id, update);
    onClose();
    apiFetch(`/api/students/${student.id}`, { method: "PATCH", body: JSON.stringify(update) }).catch((err) => {
      onStatusChange(student.id, previous);
      window.alert(err instanceof Error ? err.message : he.common.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">{student.fullName}</h2>
        <p className="mb-4 text-xs text-gray-500">{he.changeStatus.modalTitle}</p>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.changeStatus.newStatus}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StudentStatus)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {STUDENT_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {he.status[s]}
              </option>
            ))}
          </select>
        </label>

        {isGraduatedStatus(status) && (
          <label className="mt-3 flex flex-col gap-1 text-xs text-gray-600">
            {he.changeStatus.graduationYearLabel}
            <select
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value as HebrewYear)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {HEBREW_YEAR_VALUES.map((y) => (
                <option key={y} value={y}>
                  {cohortYearOptionLabel(y)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {he.common.cancel}
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {he.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
