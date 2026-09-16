"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activeYearOfStudy,
  Candidate,
  cohortYearOptionLabel,
  HEBREW_YEAR_VALUES,
  he,
  isGraduatedStatus,
  Student,
  StudentStatus,
  StudentTrack,
} from "@admin-coordinator/shared";
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
// on. A student counts as graduated by status (isGraduatedStatus, i.e. one
// of the two "מוסמך/כת" statuses set by hand), OR - only once a specific
// cycle is selected in the cohort filter - by having simply run past their
// one-year program relative to that cycle while still in good standing
// (status ACTIVE). A student whose duties aren't done (on leave, conditional,
// not-regular, canceled, etc.) is left under their track tab instead of
// being swept into graduates just because a later cycle is being viewed.
// This is a display-only inference for the selected cycle - it never writes
// back to the student's stored status.
const GRADUATED_VIEW = "GRADUATED" as const;
type DashboardView = StudentTrack | typeof GRADUATED_VIEW;

function isGraduate(student: Student, referenceCycle: string): boolean {
  if (isGraduatedStatus(student.status)) return true;
  if (!referenceCycle || student.track !== StudentTrack.REGULAR || student.status !== StudentStatus.ACTIVE) {
    return false;
  }
  if (!student.cohortYear) return false;
  return HEBREW_YEAR_VALUES.indexOf(referenceCycle as (typeof HEBREW_YEAR_VALUES)[number]) >
    HEBREW_YEAR_VALUES.indexOf(student.cohortYear);
}

// Track tabs narrow to students who started exactly in the selected cycle;
// the graduates tab already reflects the selected cycle via isGraduate
// above, so narrowing it again by exact cohortYear would hide the very
// cohorts that cycle just promoted into it.
function studentsForView(students: Student[], v: DashboardView, cohortFilter: string): Student[] {
  const byView =
    v === GRADUATED_VIEW
      ? students.filter((s) => isGraduate(s, cohortFilter))
      : students.filter((s) => s.track === v && !isGraduate(s, cohortFilter));
  return cohortFilter && v !== GRADUATED_VIEW ? byView.filter((s) => s.cohortYear === cohortFilter) : byView;
}

export default function DashboardPage() {
  const { faculty } = useFaculty();
  const [view, setView] = useState<DashboardView>(StudentTrack.REGULAR);
  const [students, setStudents] = useState<Student[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<1 | 2 | "">("");
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

  const countForView = (v: DashboardView) => studentsForView(students, v, cohortFilter).length;

  const viewOptions = useMemo(
    () => [
      {
        value: StudentTrack.REGULAR,
        label: `${he.dashboard.tabs[StudentTrack.REGULAR]} (${countForView(StudentTrack.REGULAR)})`,
      },
      {
        value: StudentTrack.COMPLETION,
        label: `${he.dashboard.tabs[StudentTrack.COMPLETION]} (${countForView(StudentTrack.COMPLETION)})`,
      },
      { value: GRADUATED_VIEW, label: `${he.dashboard.graduatesTab} (${countForView(GRADUATED_VIEW)})` },
    ],
    [students, cohortFilter]
  );

  const visibleStudents = useMemo(() => {
    const byView = studentsForView(students, view, cohortFilter);
    return view === StudentTrack.REGULAR && yearFilter
      ? byView.filter((s) => s.cohortYear && activeYearOfStudy(s.cohortYear) === yearFilter)
      : byView;
  }, [students, view, cohortFilter, yearFilter]);

  // For the name search: every tab's students for the selected cycle, so
  // searching by name surfaces matches regardless of which tab is active.
  const searchableStudents = useMemo(() => {
    const views: DashboardView[] = [StudentTrack.REGULAR, StudentTrack.COMPLETION, GRADUATED_VIEW];
    return views.flatMap((v) => studentsForView(students, v, cohortFilter));
  }, [students, cohortFilter]);

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
          {[...HEBREW_YEAR_VALUES].reverse().map((y) => (
            <option key={y} value={y}>
              {cohortYearOptionLabel(y)}
            </option>
          ))}
        </select>
        {view === StudentTrack.REGULAR && (
          <select
            value={yearFilter}
            onChange={(e) => {
              const v = e.target.value;
              setYearFilter(v === "" ? "" : (Number(v) as 1 | 2));
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{he.dashboard.yearFilterAll}</option>
            <option value="1">{he.studentCard.yearOfStudy["1"]}</option>
            <option value="2">{he.studentCard.yearOfStudy["2"]}</option>
          </select>
        )}
      </div>
      <StudentsCardGrid students={visibleStudents} allStudents={searchableStudents} candidates={candidates} />

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
