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
  StudentTrack,
} from "@admin-coordinator/shared";
import { TrackTabs } from "../../../components/TrackTabs";
import { StudentsCardGrid } from "../../../components/StudentsCardGrid";
import { AddStudentBar } from "../../../components/AddStudentBar";
import { StudentsImportModal } from "../../../components/StudentsImportModal";
import { ImportReviewModal } from "../../../components/ImportReviewModal";
import { AcademicBalanceImportModal } from "../../../components/AcademicBalanceImportModal";
import { subscribeStudents } from "../../../data/studentsRepository";
import { subscribeCandidates } from "../../../data/candidatesRepository";
import { parseSemesterGrades } from "../../../lib/import/parseSemesterGrades";
import { parseRoster } from "../../../lib/import/parseRoster";
import { useFaculty } from "../../../context/FacultyContext";

// A third view alongside the two real tracks - a graduated student shows
// here instead of under their track, regardless of which track they were
// on. A student counts as graduated only by status (isGraduatedStatus, i.e.
// one of the two "מוסמך/כת" statuses set by hand) - never inferred merely
// from having an earlier cohort year while still ACTIVE. A certified
// student only shows under the graduates tab once the cohort filter has
// caught up to them: either "כל המחזורים" (no filter), or the Hebrew year
// right after their own cohortYear - not their own cohort year, and not any
// later one either. Under their OWN cohort year's filter they instead
// belong under their track tab regardless of current status - that filter
// is a snapshot of "who was in this cohort", not a live status check, so a
// student who has since been certified still shows there. Only the
// unfiltered "כל המחזורים" view of the track tabs excludes certified
// students, since that view means "who's currently active across every
// cohort".
const GRADUATED_VIEW = "GRADUATED" as const;
type DashboardView = StudentTrack | typeof GRADUATED_VIEW;

function isGraduateVisible(student: Student, referenceCycle: string): boolean {
  if (!isGraduatedStatus(student.status)) return false;
  if (!referenceCycle) return true;
  if (!student.cohortYear) return false;
  return (
    HEBREW_YEAR_VALUES.indexOf(referenceCycle as (typeof HEBREW_YEAR_VALUES)[number]) ===
    HEBREW_YEAR_VALUES.indexOf(student.cohortYear) + 1
  );
}

// "בהשלמה" (COMPLETION) describes a student actively working through missing
// credits; once certified they're done completing, so under their own
// cohort's filter a certified student always displays as "פעיל" (REGULAR)
// regardless of their stored track - only a still-uncertified student is
// shown by their actual track.
function trackForDisplay(student: Student): StudentTrack {
  return isGraduatedStatus(student.status) ? StudentTrack.REGULAR : student.track;
}

function studentsForView(students: Student[], v: DashboardView, cohortFilter: string): Student[] {
  if (v === GRADUATED_VIEW) {
    return students.filter((s) => isGraduateVisible(s, cohortFilter));
  }
  const byTrack = students.filter((s) => trackForDisplay(s) === v);
  return cohortFilter
    ? byTrack.filter((s) => s.cohortYear === cohortFilter)
    : byTrack.filter((s) => !isGraduatedStatus(s.status));
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
  const [showBalanceImport, setShowBalanceImport] = useState(false);

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
          <button
            onClick={() => setShowBalanceImport(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {he.dashboard.importAcademicBalance}
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

      {showBalanceImport && (
        <AcademicBalanceImportModal
          students={students}
          onClose={() => setShowBalanceImport(false)}
          onDone={() => {}}
        />
      )}
    </div>
  );
}
