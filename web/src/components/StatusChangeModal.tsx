"use client";

import { useState } from "react";
import { he, Student, STUDENT_STATUS_VALUES, StudentStatus } from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

/**
 * Lets any role (admin or coordinator) set a student's status directly from
 * the שינוי סטטוס list. Just a plain status write for now - the richer
 * track-transition flow (e.g. what else should happen when a student moves
 * off בהשלמה) is still being decided; this only ever PATCHes `status`.
 */
export function StatusChangeModal({
  student,
  onClose,
}: {
  student: Student;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<StudentStatus>(student.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/students/${student.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSaving(false);
    }
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

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {he.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {saving ? he.common.loading : he.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
