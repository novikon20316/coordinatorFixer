"use client";

import { useState } from "react";
import {
  CandidateCreateInput,
  CandidateStatus,
  CURRENT_HEBREW_YEAR,
  Faculty,
  he,
  HEBREW_YEAR_VALUES,
  HebrewYear,
} from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

export function AddCandidateBar({ faculty, onCreated }: { faculty: Faculty; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [applyingForYear, setApplyingForYear] = useState<HebrewYear>(CURRENT_HEBREW_YEAR);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input: CandidateCreateInput = {
        fullName,
        faculty,
        applyingForYear,
        previousCollege: "",
        degreeField: "",
        gpa: 0,
        background: "",
        status: CandidateStatus.PENDING,
        source: "MANUAL",
      };
      await apiFetch("/api/candidates", { method: "POST", body: JSON.stringify(input) });
      setFullName("");
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
        {he.candidates.applyingForYear}
        <select
          value={applyingForYear}
          onChange={(e) => setApplyingForYear(e.target.value as HebrewYear)}
          className={inputClass}
        >
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
        {submitting ? he.common.loading : he.candidates.addNew}
      </button>

      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
