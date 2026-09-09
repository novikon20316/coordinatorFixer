"use client";

import { useEffect, useState } from "react";
import { Faculty, he, Student, StudentTrack } from "@admin-coordinator/shared";
import { TrackTabs } from "../../../components/TrackTabs";
import { StudentsCardGrid } from "../../../components/StudentsCardGrid";
import { AddStudentBar } from "../../../components/AddStudentBar";
import { StudentsImportModal } from "../../../components/StudentsImportModal";
import { subscribeStudents } from "../../../data/studentsRepository";

// Faculty selection will become a real picker once additional faculties exist.
const CURRENT_FACULTY = Faculty.DATA_SCIENCE;

export default function DashboardPage() {
  const [track, setTrack] = useState<StudentTrack>(StudentTrack.REGULAR);
  const [students, setStudents] = useState<Student[]>([]);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeStudents(CURRENT_FACULTY, track, setStudents);
    return unsubscribe;
  }, [track]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{he.menu.overview}</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {he.dashboard.importStudents}
        </button>
      </div>

      {/* No manual refetch after adding/importing: subscribeStudents' onSnapshot
          listener above already receives newly created docs in real time. */}
      <AddStudentBar faculty={CURRENT_FACULTY} onCreated={() => {}} />

      <TrackTabs value={track} onChange={setTrack} />
      <StudentsCardGrid students={students} />

      {showImport && <StudentsImportModal onClose={() => setShowImport(false)} onImported={() => {}} />}
    </div>
  );
}
