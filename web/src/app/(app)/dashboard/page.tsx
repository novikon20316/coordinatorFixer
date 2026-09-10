"use client";

import { useEffect, useMemo, useState } from "react";
import { Candidate, HEBREW_YEAR_VALUES, he, Student, StudentStatus, StudentTrack } from "@admin-coordinator/shared";
import { TrackTabs } from "../../../components/TrackTabs";
import { StudentsCardGrid } from "../../../components/StudentsCardGrid";
import { AddStudentBar } from "../../../components/AddStudentBar";
import { StudentsImportModal } from "../../../components/StudentsImportModal";
import { ImportReviewModal } from "../../../components/ImportReviewModal";
import { subscribeStudents } from "../../../data/studentsRepository";
import { subscribeCandidates } from "../../../data/candidatesRepository";
import { parseSemesterGrades } from "../../../lib/import/parseSemesterGrades";
import { parseRoster } from "../../../lib/import/parseRoster";
import { useFaculty } from "../../../context/FacultyContext";

// A third view alongside the two real tracks - a graduated student shows
// here instead of under their track, regardless of which track they were
// on (see StudentStatus.GRADUATED).
const GRADUATED_VIEW = "GRADUATED" as const;
type DashboardView = StudentTrack | typeof GRADUATED_VIEW;

export default function DashboardPage() {
  const { faculty } = useFaculty();
  const [view, setView] = useState<DashboardView>(StudentTrack.REGULAR);
  const [students, setStudents] = useState<Student[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [showImport, setShowImport] = useState(false);
  const [showGradesImport, setShowGradesImport] = useState(false);
  const [showRosterImport, setShowRosterImport] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeStudents(faculty, setStudents);
    return unsubscribe;
  }, [faculty]);

  // Needed to look up a student's original candidate record for their
  // required קורסי השלמה - see lib/completionCourses.ts.
  useEffect(() => {
    const unsubscribe = subscribeCandidates(faculty, setCandidates);
    return unsubscribe;
  }, [faculty]);

  const viewOptions = useMemo(
    () => [
      { value: StudentTrack.REGULAR, label: he.dashboard.tabs[StudentTrack.REGULAR] },
      { value: StudentTrack.COMPLETION, label: he.dashboard.tabs[StudentTrack.COMPLETION] },
      { value: GRADUATED_VIEW, label: he.dashboard.graduatesTab },
    ],
    []
  );

  const visibleStudents = useMemo(() => {
    const byView =
      view === GRADUATED_VIEW
        ? students.filter((s) => s.status === StudentStatus.GRADUATED)
        : students.filter((s) => s.track === view && s.status !== StudentStatus.GRADUATED);
    return cohortFilter ? byView.filter((s) => s.cohortYear === cohortFilter) : byView;
  }, [students, view, cohortFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{he.menu.overview}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowRosterImport(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {he.dashboard.importRoster}
          </button>
          <button
            onClick={() => setShowGradesImport(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {he.dashboard.importGrades}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {he.dashboard.importStudents}
          </button>
        </div>
      </div>

      {/* No manual refetch after adding/importing: subscribeStudents' onSnapshot
          listener above already receives newly created docs in real time. */}
      <AddStudentBar faculty={faculty} onCreated={() => {}} />

      <div className="flex flex-wrap items-center gap-3">
        <TrackTabs value={view} onChange={setView} options={viewOptions} />
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{he.dashboard.cohortFilterAll}</option>
          {HEBREW_YEAR_VALUES.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <StudentsCardGrid students={visibleStudents} candidates={candidates} />

      {showImport && <StudentsImportModal onClose={() => setShowImport(false)} onImported={() => {}} />}

      {showGradesImport && (
        <ImportReviewModal
          title={he.dashboard.importGrades}
          yearLabel={he.studentForm.cohortYear}
          parseSheet={(rows, year) =>
            parseSemesterGrades(rows, { cohortYear: year, faculty, existing: students })
          }
          onClose={() => setShowGradesImport(false)}
          onDone={() => {}}
        />
      )}

      {showRosterImport && (
        <ImportReviewModal
          title={he.dashboard.importRoster}
          yearLabel={he.studentForm.cohortYear}
          parseSheet={(rows, year) => parseRoster(rows, { asOfYear: year, faculty, existing: students })}
          onClose={() => setShowRosterImport(false)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}
