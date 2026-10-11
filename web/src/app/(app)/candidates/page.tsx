"use client";

import { useEffect, useMemo, useState } from "react";
import { Candidate, CandidateStatus, cohortYearOptionLabel, he, HEBREW_YEAR_VALUES } from "@admin-coordinator/shared";
import { CandidatesCardGrid } from "../../../components/CandidatesCardGrid";
import { AddCandidateBar } from "../../../components/AddCandidateBar";
import { ImportReviewModal } from "../../../components/ImportReviewModal";
import { subscribeCandidates } from "../../../data/candidatesRepository";
import { parseCandidatePool } from "../../../lib/import/parseCandidatePool";
import { useFaculty } from "../../../context/FacultyContext";

export default function CandidatesPage() {
  const { faculty } = useFaculty();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [cohortFilter, setCohortFilter] = useState<string>("");

  useEffect(() => {
    const unsubscribe = subscribeCandidates(faculty, setCandidates);
    return unsubscribe;
  }, [faculty]);

  const filteredCandidates = useMemo(() => {
    // This screen is a review inbox: once the coordinator decides a status
    // (accepted/rejected/withdrawn), the candidate is resolved and moves off
    // of it - an accepted one becomes a Student on the dashboard's own tabs
    // instead, so nothing ends up shown in both places at once.
    const pending = candidates.filter((c) => c.status === CandidateStatus.PENDING);
    return cohortFilter ? pending.filter((c) => c.applyingForYear === cohortFilter) : pending;
  }, [candidates, cohortFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{he.candidates.title}</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {he.candidates.importCandidates}
        </button>
      </div>

      <select
        value={cohortFilter}
        onChange={(e) => setCohortFilter(e.target.value)}
        className="w-fit rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">{he.dashboard.cohortFilterAll}</option>
        {HEBREW_YEAR_VALUES.map((y) => (
          <option key={y} value={y}>
            {cohortYearOptionLabel(y)}
          </option>
        ))}
      </select>

      {/* No manual refetch after adding/importing/promoting: subscribeCandidates'
          onSnapshot listener above already receives changes in real time. */}
      <AddCandidateBar faculty={faculty} onCreated={() => {}} />

      <CandidatesCardGrid candidates={filteredCandidates} onPromoted={() => {}} />

      {showImport && (
        <ImportReviewModal
          title={he.candidates.importCandidates}
          yearLabel={he.candidates.applyingForYear}
          parseSheet={(rows, year) => parseCandidatePool(rows, { applyingForYear: year, faculty, existing: candidates })}
          onClose={() => setShowImport(false)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}
