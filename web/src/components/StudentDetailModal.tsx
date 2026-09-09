"use client";

import { useState } from "react";
import { DEGREE_TYPE_VALUES, DegreeType, he, Student, StudentStatus } from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

const STATUS_STYLES: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "bg-green-100 text-green-800",
  [StudentStatus.REGISTERED]: "bg-blue-100 text-blue-800",
  [StudentStatus.REJECTED]: "bg-red-100 text-red-800",
  [StudentStatus.CANCELED]: "bg-gray-200 text-gray-700",
};

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function StudentDetailModal({ student, onClose }: { student: Student; onClose: () => void }) {
  // Not synced back from live updates after the first render, same tradeoff
  // as StudentCard's local drafts - see that component's comment.
  const [previousCollege, setPreviousCollege] = useState(student.previousCollege);
  const [degreeField, setDegreeField] = useState(student.degreeField);
  const [degreeType, setDegreeType] = useState<DegreeType>(student.degreeType);
  const [gpa, setGpa] = useState(student.gpa ? String(student.gpa) : "");
  const [background, setBackground] = useState(student.background);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/students/${student.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          previousCollege,
          degreeField,
          degreeType,
          gpa: Number(gpa) || 0,
          background,
        }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{student.fullName}</h2>
            <p className="text-xs text-gray-500">{he.studentDetail.title}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[student.status]}`}
          >
            {he.status[student.status]}
          </span>
        </div>

        {student.source === "IMPORTED" && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {he.studentDetail.importedBadge}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <Section title={he.studentDetail.personalSection}>
            <Field label={he.table.columns.fullName} value={student.fullName} />
            <Field label={he.studentForm.idNumber} value={student.idNumber} />
            <Field label={he.coordinators.faculty} value={he.faculty[student.faculty]} />
            <Field label={he.studentForm.track} value={he.dashboard.tabs[student.track]} />
          </Section>

          <Section title={he.studentDetail.academicSection}>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {he.table.columns.previousCollege}
              <input
                value={previousCollege}
                onChange={(e) => setPreviousCollege(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {he.table.columns.degreeField}
              <input value={degreeField} onChange={(e) => setDegreeField(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {he.table.columns.degreeType}
              <select
                value={degreeType}
                onChange={(e) => setDegreeType(e.target.value as DegreeType)}
                className={inputClass}
              >
                {DEGREE_TYPE_VALUES.map((d) => (
                  <option key={d} value={d}>
                    {he.degreeType[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {he.table.columns.gpa}
              <input type="number" min={0} max={100} value={gpa} onChange={(e) => setGpa(e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500 sm:col-span-2">
              {he.table.columns.background}
              <input value={background} onChange={(e) => setBackground(e.target.value)} className={inputClass} />
            </label>
          </Section>

          <p className="-mt-2 text-xs text-gray-500">{he.statusDescription[student.status]}</p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {he.studentDetail.close}
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
