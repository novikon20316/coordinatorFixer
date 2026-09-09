"use client";

import { useMemo, useState } from "react";
import { he, Student } from "@admin-coordinator/shared";
import { StudentCard } from "./StudentCard";

export function StudentsCardGrid({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.idNumber?.toLowerCase().includes(q)
    );
  }, [students, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">{he.dashboard.studentsListTitle}</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={he.dashboard.searchPlaceholder}
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 py-16 text-center text-gray-500">{he.common.noData}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}
