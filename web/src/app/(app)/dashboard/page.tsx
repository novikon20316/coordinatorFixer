"use client";

import { useEffect, useMemo, useState } from "react";
import { Faculty, he, Student, StudentTrack } from "@admin-coordinator/shared";
import { TrackTabs } from "../../../components/TrackTabs";
import { StudentsFilters, StudentFilterState, applyFilters, emptyFilters } from "../../../components/StudentsFilters";
import { StudentsTable } from "../../../components/StudentsTable";
import { subscribeStudents } from "../../../data/studentsRepository";

// Faculty selection will become a real picker once additional faculties exist.
const CURRENT_FACULTY = Faculty.DATA_SCIENCE;

export default function DashboardPage() {
  const [track, setTrack] = useState<StudentTrack>(StudentTrack.REGULAR);
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<StudentFilterState>(emptyFilters);

  useEffect(() => {
    setFilters(emptyFilters);
    const unsubscribe = subscribeStudents(CURRENT_FACULTY, track, setStudents);
    return unsubscribe;
  }, [track]);

  const filtered = useMemo(() => applyFilters(students, filters), [students, filters]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{he.menu.overview}</h1>
      <TrackTabs value={track} onChange={setTrack} />
      <StudentsFilters students={students} value={filters} onChange={setFilters} />
      <StudentsTable students={filtered} />
    </div>
  );
}
