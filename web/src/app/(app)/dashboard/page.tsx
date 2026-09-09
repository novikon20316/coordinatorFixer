"use client";

import { useEffect, useMemo, useState } from "react";
import { Faculty, he, Student, StudentTrack } from "@admin-coordinator/shared";
import { TrackTabs } from "../../../components/TrackTabs";
import { StudentsFilters, StudentFilterState, applyFilters, emptyFilters } from "../../../components/StudentsFilters";
import { StudentsTable } from "../../../components/StudentsTable";
import { AddStudentModal } from "../../../components/AddStudentModal";
import { StudentsImportModal } from "../../../components/StudentsImportModal";
import { subscribeStudents } from "../../../data/studentsRepository";

// Faculty selection will become a real picker once additional faculties exist.
const CURRENT_FACULTY = Faculty.DATA_SCIENCE;

export default function DashboardPage() {
  const [track, setTrack] = useState<StudentTrack>(StudentTrack.REGULAR);
  const [students, setStudents] = useState<Student[]>([]);
  const [filters, setFilters] = useState<StudentFilterState>(emptyFilters);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    setFilters(emptyFilters);
    const unsubscribe = subscribeStudents(CURRENT_FACULTY, track, setStudents);
    return unsubscribe;
  }, [track]);

  const filtered = useMemo(() => applyFilters(students, filters), [students, filters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{he.menu.overview}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {he.dashboard.importStudents}
          </button>
          <button
            onClick={() => setShowAddStudent(true)}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {he.dashboard.addStudent}
          </button>
        </div>
      </div>
      <TrackTabs value={track} onChange={setTrack} />
      <StudentsFilters students={students} value={filters} onChange={setFilters} />
      <StudentsTable students={filtered} />

      {/* No manual refetch on success: subscribeStudents' onSnapshot listener
          above already receives newly created/imported docs in real time. */}
      {showAddStudent && (
        <AddStudentModal faculty={CURRENT_FACULTY} onClose={() => setShowAddStudent(false)} onCreated={() => {}} />
      )}
      {showImport && <StudentsImportModal onClose={() => setShowImport(false)} onImported={() => {}} />}
    </div>
  );
}
