"use client";

import { useState } from "react";
import {
  cohortYearOptionLabel,
  CURRENT_HEBREW_YEAR,
  DegreeType,
  Faculty,
  he,
  HEBREW_YEAR_VALUES,
  HebrewYear,
  StudentCreateInput,
  StudentStatus,
  StudentTrack,
} from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

export function AddStudentModal({
  faculty,
  onClose,
  onCreated,
}: {
  faculty: Faculty;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [cohortYear, setCohortYear] = useState<HebrewYear>(CURRENT_HEBREW_YEAR);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input: StudentCreateInput = {
        fullName,
        idNumber,
        faculty,
        track: StudentTrack.REGULAR,
        cohortYear,
        // Admissions review now lives on the separate Candidate record (see
        // types/candidate.ts) - a manually added Student starts ACTIVE.
        status: StudentStatus.ACTIVE,
        // Not collected at intake - a coordinator fills these in later via
        // the card's "more details" view.
        previousCollege: "",
        degreeField: "",
        degreeType: DegreeType.OTHER,
        gpa: 0,
        background: "",
        source: "MANUAL",
      };
      await apiFetch("/api/students", { method: "POST", body: JSON.stringify(input) });
      // subscribeStudents' onSnapshot listener already picks up the new doc
      // in real time - onCreated is just a hook for callers that want one.
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-bold text-gray-900">{he.studentForm.title}</h2>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.table.columns.fullName}
          <input
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={he.studentForm.fullNamePlaceholder}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.studentForm.idNumber}
          <input
            required
            dir="ltr"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder={he.studentForm.idNumberPlaceholder}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.studentForm.cohortYear}
          <select value={cohortYear} onChange={(e) => setCohortYear(e.target.value as HebrewYear)} className={inputClass}>
            {HEBREW_YEAR_VALUES.map((y) => (
              <option key={y} value={y}>
                {cohortYearOptionLabel(y)}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {he.common.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? he.common.loading : he.studentForm.create}
          </button>
        </div>
      </form>
    </div>
  );
}
