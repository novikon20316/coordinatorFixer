"use client";

import { useState } from "react";
import {
  DEGREE_TYPE_VALUES,
  DegreeType,
  Faculty,
  he,
  StudentCreateInput,
  StudentStatus,
  StudentTrack,
  STUDENT_TRACK_VALUES,
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
  const [track, setTrack] = useState<StudentTrack>(StudentTrack.REGULAR);
  const [previousCollege, setPreviousCollege] = useState("");
  const [degreeField, setDegreeField] = useState("");
  const [degreeType, setDegreeType] = useState<DegreeType>(DegreeType.BSC);
  const [gpa, setGpa] = useState("");
  const [background, setBackground] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input: StudentCreateInput = {
        fullName,
        faculty,
        track,
        // New candidates start under committee review, same as a freshly
        // imported row (see he.statusDescription for StudentStatus.REGISTERED).
        status: StudentStatus.REGISTERED,
        previousCollege,
        degreeField,
        degreeType,
        gpa: Number(gpa) || 0,
        background,
        source: "MANUAL",
      };
      await apiFetch("/api/students", { method: "POST", body: JSON.stringify(input) });
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
        className="flex w-full max-w-lg flex-col gap-4 rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-bold text-gray-900">{he.studentForm.title}</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-gray-700">{he.table.columns.fullName}</span>
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{he.studentForm.track}</span>
            <select value={track} onChange={(e) => setTrack(e.target.value as StudentTrack)} className={inputClass}>
              {STUDENT_TRACK_VALUES.map((t) => (
                <option key={t} value={t}>
                  {he.dashboard.tabs[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{he.table.columns.degreeType}</span>
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

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{he.table.columns.previousCollege}</span>
            <input
              required
              value={previousCollege}
              onChange={(e) => setPreviousCollege(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{he.table.columns.degreeField}</span>
            <input
              required
              value={degreeField}
              onChange={(e) => setDegreeField(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{he.table.columns.gpa}</span>
            <input
              required
              type="number"
              min={0}
              max={100}
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-gray-700">{he.table.columns.background}</span>
            <input value={background} onChange={(e) => setBackground(e.target.value)} className={inputClass} />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
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
