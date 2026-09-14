"use client";

import { useState } from "react";
import { Candidate, CandidateStatus, he } from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

const STATUS_STYLES: Record<CandidateStatus, string> = {
  [CandidateStatus.PENDING]: "bg-blue-100 text-blue-800",
  [CandidateStatus.ACCEPTED]: "bg-green-100 text-green-800",
  [CandidateStatus.REJECTED]: "bg-red-100 text-red-800",
  [CandidateStatus.WITHDRAWN]: "bg-gray-200 text-gray-700",
};

const DECISION_VALUES: ("REGULAR" | "CONDITIONAL" | "NOT_REGULAR" | "")[] = [
  "",
  "REGULAR",
  "CONDITIONAL",
  "NOT_REGULAR",
];

export function CandidateCard({
  candidate,
  onPromoted,
  expanded,
  onToggleExpanded,
}: {
  candidate: Candidate;
  onPromoted: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const [previousCollege, setPreviousCollege] = useState(candidate.previousCollege);
  const [degreeField, setDegreeField] = useState(candidate.degreeField);
  const [gpa, setGpa] = useState(candidate.gpa ? String(candidate.gpa) : "");
  const [background, setBackground] = useState(candidate.background);
  const [acceptanceDecision, setAcceptanceDecision] = useState(candidate.acceptanceDecision ?? "");
  const [committeeNotes, setCommitteeNotes] = useState(candidate.committeeNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);

  async function save(patch: Record<string, unknown>) {
    setError(null);
    try {
      await apiFetch(`/api/candidates/${candidate.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    }
  }

  async function handlePromote() {
    if (!confirm(he.candidates.promoteConfirm)) return;
    setPromoting(true);
    setError(null);
    try {
      await apiFetch(`/api/candidates/${candidate.id}/promote`, { method: "POST" });
      onPromoted();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setPromoting(false);
    }
  }

  const inputClass = "rounded-md border border-gray-300 bg-white px-2 py-1 text-sm";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? he.studentCard.collapse : he.studentCard.expand}
          className="flex flex-1 items-start gap-2 text-right"
        >
          <span
            className={`mt-1 inline-block text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▶
          </span>
          <div>
            <h3 className="font-bold text-gray-900">{candidate.fullName}</h3>
            <p className="text-xs text-gray-500">
              {he.candidates.applyingForYear} {candidate.applyingForYear}
            </p>
          </div>
        </button>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[candidate.status]}`}>
          {he.candidateStatus[candidate.status]}
        </span>
      </div>

      {expanded && (
        <>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          {he.candidates.previousCollege}
          <input
            value={previousCollege}
            onChange={(e) => setPreviousCollege(e.target.value)}
            onBlur={() => save({ previousCollege })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          {he.candidates.degreeField}
          <input
            value={degreeField}
            onChange={(e) => setDegreeField(e.target.value)}
            onBlur={() => save({ degreeField })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          {he.candidates.gpa}
          <input
            type="number"
            min={0}
            max={100}
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            onBlur={() => save({ gpa: Number(gpa) || 0 })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          {he.candidates.acceptanceDecision}
          <select
            value={acceptanceDecision}
            onChange={(e) => {
              const value = e.target.value as typeof acceptanceDecision;
              setAcceptanceDecision(value);
              save({ acceptanceDecision: value });
            }}
            className={inputClass}
          >
            {DECISION_VALUES.map((d) => (
              <option key={d} value={d}>
                {he.candidates.acceptanceDecisionOptions[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs text-gray-500">
          {he.candidates.background}
          <input
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            onBlur={() => save({ background })}
            className={inputClass}
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-xs text-gray-500">
          {he.candidates.committeeNotes}
          <input
            value={committeeNotes}
            onChange={(e) => setCommitteeNotes(e.target.value)}
            onBlur={() => save({ committeeNotes })}
            className={inputClass}
          />
        </label>
      </div>

      {candidate.completionCourses && candidate.completionCourses.length > 0 && (
        <div>
          <h5 className="mb-1 text-xs font-semibold text-gray-500">{he.candidates.completionCoursesSection}</h5>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
            {candidate.completionCourses.map((c, i) => (
              <span key={i} className="rounded-md bg-gray-50 px-2 py-0.5">
                {c.name}: {c.grade ?? "—"}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-end border-t border-gray-100 pt-3">
        {candidate.promotedStudentId ? (
          <span className="text-xs font-medium text-gray-500">{he.candidates.alreadyPromoted}</span>
        ) : (
          <button
            onClick={handlePromote}
            disabled={promoting}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {promoting ? he.common.loading : he.candidates.promote}
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}
