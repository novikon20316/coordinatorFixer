"use client";

import { useMemo, useState } from "react";
import { Candidate, he } from "@admin-coordinator/shared";
import { CandidateCard } from "./CandidateCard";

export function CandidatesCardGrid({ candidates, onPromoted }: { candidates: Candidate[]; onPromoted: () => void }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => c.fullName.toLowerCase().includes(q));
  }, [candidates, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">{he.candidates.title}</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={he.dashboard.searchPlaceholder}
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center text-gray-500">
          {he.candidates.noCandidates}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CandidateCard key={c.id} candidate={c} onPromoted={onPromoted} />
          ))}
        </div>
      )}
    </div>
  );
}
