"use client";

import { useMemo, useState } from "react";
import { Candidate, he, isActiveCourseworkFullyDone, Student, StudentStatus } from "@admin-coordinator/shared";
import { StudentCard } from "./StudentCard";
import { FloatingDetailPanels } from "./FloatingDetailPanels";
import { DetailPanelsProvider } from "../context/DetailPanelsContext";
import { findRequiredCompletionCourses, isCompletionGradingDone } from "../lib/completionCourses";

export function StudentsCardGrid(props: {
  students: Student[];
  allStudents?: Student[];
  candidates?: Candidate[];
  /** Bumped per student id (e.g. after an external write like the academic
   *  balance import) to force just that student's card to remount and pick
   *  up the fresh data - see StudentCard's doc comment on why it otherwise
   *  never re-syncs from a write it didn't make itself. */
  refreshTokens?: Record<string, number>;
  /** Forwarded to each StudentCard so the parent can optimistically patch
   *  its own students state on a status change made from this grid, instead
   *  of waiting on the subscribeStudents round trip - see StudentCard's own
   *  doc comment on onStatusChange. */
  onStatusChange?: (studentId: string, status: StudentStatus) => void;
}) {
  return (
    <DetailPanelsProvider>
      <StudentsCardGridBody {...props} />
      <FloatingDetailPanels />
    </DetailPanelsProvider>
  );
}

function StudentsCardGridBody({
  students,
  allStudents,
  candidates = [],
  refreshTokens = {},
  onStatusChange,
}: {
  students: Student[];
  // Optional broader pool (e.g. every tab's students) to search across once
  // the coordinator types a query, instead of only the current tab's list.
  allStudents?: Student[];
  candidates?: Candidate[];
  refreshTokens?: Record<string, number>;
  onStatusChange?: (studentId: string, status: StudentStatus) => void;
}) {
  const [search, setSearch] = useState("");
  // Alphabetical (א-ת) by default - the coordinator asked to see the list
  // ordered by name rather than Firestore's arbitrary insertion order.
  const [sortAscending, setSortAscending] = useState(true);
  // Cards start collapsed to just a name/status row - the coordinator only
  // wants a student's full details once she deliberately opens that card.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q && allStudents ? allStudents : students;
    const matches = q
      ? pool.filter((s) => s.fullName.toLowerCase().includes(q) || s.idNumber?.toLowerCase().includes(q))
      : pool;
    return [...matches].sort((a, b) => {
      const cmp = a.fullName.localeCompare(b.fullName, "he");
      return sortAscending ? cmp : -cmp;
    });
  }, [students, allStudents, search, sortAscending]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">{he.dashboard.studentsListTitle}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortAscending((v) => !v)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {sortAscending ? he.dashboard.sortAscending : he.dashboard.sortDescending}
          </button>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={he.dashboard.searchPlaceholder}
            className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center text-gray-500">{he.common.noData}</div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <StudentCard
              key={refreshTokens[s.id] ? `${s.id}:${refreshTokens[s.id]}` : s.id}
              student={s}
              requiredCompletionCourses={findRequiredCompletionCourses(s, candidates)}
              needsCompletionAttention={isCompletionGradingDone(s, candidates)}
              needsActiveReviewAttention={isActiveCourseworkFullyDone(s)}
              expanded={expandedIds.has(s.id)}
              onToggleExpanded={() => toggleExpanded(s.id)}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
