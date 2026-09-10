"use client";

import { useState } from "react";
import {
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

export function AddStudentBar({ faculty, onCreated }: { faculty: Faculty; onCreated: () => void }) {
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
        // New candidates start under committee review, same as a freshly
        // imported row (see he.statusDescription for StudentStatus.REGISTERED).
        status: StudentStatus.REGISTERED,
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
      setFullName("");
      setIdNumber("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end justify-between gap-3">
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {he.table.columns.fullName}
        <input
          required
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
              {y}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {submitting ? he.common.loading : he.studentForm.title}
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
