"use client";

import { useEffect, useState } from "react";
import { Candidate, Faculty, he } from "@admin-coordinator/shared";
import { CandidatesCardGrid } from "../../../components/CandidatesCardGrid";
import { AddCandidateBar } from "../../../components/AddCandidateBar";
import { ImportReviewModal } from "../../../components/ImportReviewModal";
import { subscribeCandidates } from "../../../data/candidatesRepository";
import { parseCandidatePool } from "../../../lib/import/parseCandidatePool";

// Matches the dashboard's own CURRENT_FACULTY scoping - see that page.
const CURRENT_FACULTY = Faculty.DATA_SCIENCE;

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeCandidates(CURRENT_FACULTY, setCandidates);
    return unsubscribe;
  }, []);

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

      {/* No manual refetch after adding/importing/promoting: subscribeCandidates'
          onSnapshot listener above already receives changes in real time. */}
      <AddCandidateBar faculty={CURRENT_FACULTY} onCreated={() => {}} />

      <CandidatesCardGrid candidates={candidates} onPromoted={() => {}} />

      {showImport && (
        <ImportReviewModal
          title={he.candidates.importCandidates}
          yearLabel={he.candidates.applyingForYear}
          parseSheet={(rows, year) =>
            parseCandidatePool(rows, { applyingForYear: year, faculty: CURRENT_FACULTY, existing: candidates })
          }
          onClose={() => setShowImport(false)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}
