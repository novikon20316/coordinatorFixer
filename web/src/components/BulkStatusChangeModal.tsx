"use client";

import { useState } from "react";
import { he, Student, STUDENT_STATUS_VALUES, StudentStatus } from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

/**
 * Same idea as StatusChangeModal, but applies one chosen status to every
 * student in `students` at once - for a coordinator who has already reviewed
 * a filtered list (e.g. everyone due for graduation review, see
 * isDueForGraduationReview) and wants to close them all out together instead
 * of clicking through one by one. Still a real per-student PATCH under the
 * hood, just fired for the whole list; a student whose PATCH fails is
 * reported by name afterward instead of failing the rest.
 */
export function BulkStatusChangeModal({
  students,
  onClose,
  onStatusChange,
}: {
  students: Student[];
  onClose: () => void;
  onStatusChange: (studentId: string, status: StudentStatus) => void;
}) {
  const [status, setStatus] = useState<StudentStatus>(StudentStatus.GRADUATED_ELIGIBLE);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const failures: string[] = [];
    await Promise.all(
      students.map(async (student) => {
        try {
          await apiFetch(`/api/students/${student.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
          onStatusChange(student.id, status);
        } catch {
          failures.push(student.fullName);
        }
      })
    );
    setSaving(false);
    onClose();
    if (failures.length > 0) {
      window.alert(`${he.common.error}: ${failures.join(", ")}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">
          {he.changeStatus.bulkModalTitle.replace("{count}", String(students.length))}
        </h2>
        <p className="mb-4 text-xs text-gray-500">{he.changeStatus.bulkModalWarning}</p>

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

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {he.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {he.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
