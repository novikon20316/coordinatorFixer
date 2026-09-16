"use client";

import { useState } from "react";
import {
  cohortYearOptionLabel,
  DEGREE_TYPE_VALUES,
  DegreeType,
  he,
  HEBREW_YEAR_VALUES,
  HebrewYear,
  STUDENT_TRACK_VALUES,
  Student,
  StudentStatus,
  StudentTrack,
} from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

const STATUS_STYLES: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "bg-green-100 text-green-800",
  [StudentStatus.CANCELED_REGISTRATION]: "bg-gray-200 text-gray-700",
  [StudentStatus.INTERNAL_MAPPING]: "bg-slate-200 text-slate-700",
  [StudentStatus.NOT_REGULAR]: "bg-orange-100 text-orange-800",
  [StudentStatus.CONDITIONAL]: "bg-yellow-100 text-yellow-800",
  [StudentStatus.ON_LEAVE]: "bg-blue-100 text-blue-800",
  [StudentStatus.GRADUATED_ELIGIBLE]: "bg-purple-100 text-purple-800",
  [StudentStatus.GRADUATED_PENDING]: "bg-purple-50 text-purple-700",
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
  const [cohortYear, setCohortYear] = useState<HebrewYear | "">(student.cohortYear ?? "");
  const [track, setTrack] = useState<StudentTrack>(student.track);
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
          cohortYear: cohortYear || undefined,
          track,
          // Sticky historical flag for the Reports page's "האם היה בהשלמה"
          // column - once true, stays true even after track moves off
          // COMPLETION (see the field's own doc comment in types/student.ts).
          wasEverCompletion:
            student.wasEverCompletion || student.track === StudentTrack.COMPLETION || track === StudentTrack.COMPLETION,
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
    <div className="flex max-h-[28rem] w-[380px] shrink-0 flex-col overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
      <button
        type="button"
        onClick={onClose}
        className="mb-3 flex items-center gap-1 self-start text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        <span aria-hidden>→</span>
        {he.common.back}
      </button>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{student.fullName}</h2>
          <p className="text-xs text-gray-500">{he.studentDetail.title}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[student.status]}`}>
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
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {he.studentForm.track}
              <select value={track} onChange={(e) => setTrack(e.target.value as StudentTrack)} className={inputClass}>
                {STUDENT_TRACK_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {he.dashboard.tabs[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {he.studentForm.cohortYear}
              <select
                value={cohortYear}
                onChange={(e) => setCohortYear(e.target.value as HebrewYear | "")}
                className={inputClass}
              >
                <option value="">—</option>
                {HEBREW_YEAR_VALUES.map((y) => (
                  <option key={y} value={y}>
                    {cohortYearOptionLabel(y)}
                  </option>
                ))}
              </select>
            </label>
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
  );
}
