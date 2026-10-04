"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activeYearOfStudy,
  addHebrewYears,
  Candidate,
  cohortYearOptionLabel,
  HEBREW_YEAR_VALUES,
  he,
  HebrewYear,
  isGraduatedStatus,
  Student,
  StudentStatus,
  StudentTrack,
} from "@admin-coordinator/shared";
import { TrackTabs } from "../../../components/TrackTabs";
import { StudentsCardGrid } from "../../../components/StudentsCardGrid";
import { AddStudentModal } from "../../../components/AddStudentModal";
import { StudentsImportModal } from "../../../components/StudentsImportModal";
import { ImportReviewModal } from "../../../components/ImportReviewModal";
import { AcademicBalanceImportModal } from "../../../components/AcademicBalanceImportModal";
import { CompletionAttentionToast } from "../../../components/CompletionAttentionToast";
import { subscribeStudents } from "../../../data/studentsRepository";
import { subscribeCandidates } from "../../../data/candidatesRepository";
import { parseSemesterGrades } from "../../../lib/import/parseSemesterGrades";
import { parseRoster } from "../../../lib/import/parseRoster";
import { useFaculty } from "../../../context/FacultyContext";
import { useCompletionAttentionAlerts } from "../../../hooks/useCompletionAttentionAlerts";
import { useActiveGraduationAttentionAlerts } from "../../../hooks/useActiveGraduationAttentionAlerts";

// A third view alongside the two real tracks - a graduated student shows
// here instead of under their track, regardless of which track they were
// on. A student counts as graduated only by status (isGraduatedStatus, i.e.
// one of the two "מוסמך/כת" statuses set by hand) - never inferred merely
// from having an earlier cohort year while still ACTIVE. A certified
// student only shows under the graduates tab once the cohort filter has
// caught up to their actual graduationYear: either "כל המחזורים" (no
// filter), or any Hebrew year from graduationYear onward (accumulating in
// every later year's filter too, never dropping back out) - never a year
// before it. Since the program nominally runs 2 years but some students take
// longer, graduationYear is the real recorded finish year rather than an
// assumption; a record saved before that field existed falls back to
// cohortYear + 1 here. Under their OWN cohort year's filter a certified
// student instead belongs under their track tab regardless of current
// status - that filter is a snapshot of "who was in this cohort", not a live
// status check. Only the unfiltered "כל המחזורים" view of the track tabs
// excludes certified students, since that view means "who's currently
// active across every cohort".
const GRADUATED_VIEW = "GRADUATED" as const;
// A fourth view alongside the two tracks and GRADUATED - a student whose
// status is CANCELED_REGISTRATION (ביטל הרשמה) shows here instead of under
// their track, mirroring how the change-status table's מצב הרשמה column
// shows them as "לא פעיל" regardless of track. Same cohort-filter behavior
// as GRADUATED_VIEW: excluded from their track tab only in the unfiltered
// "כל המחזורים" view; under their own cohort's filter they still show under
// their track tab, since that filter is a snapshot of "who was in this
// cohort" rather than a live status check.
const INACTIVE_VIEW = "INACTIVE" as const;
type DashboardView = StudentTrack | typeof GRADUATED_VIEW | typeof INACTIVE_VIEW;

function graduationYearForDisplay(student: Student): HebrewYear | undefined {
  if (student.graduationYear) return student.graduationYear;
  if (!student.cohortYear) return undefined;
  try {
    return addHebrewYears(student.cohortYear, 1);
  } catch {
    return undefined;
  }
}

function isGraduateVisible(student: Student, referenceCycle: string): boolean {
  if (!isGraduatedStatus(student.status)) return false;
  if (!referenceCycle) return true;
  const graduationYear = graduationYearForDisplay(student);
  if (!graduationYear) return false;
  return (
    HEBREW_YEAR_VALUES.indexOf(referenceCycle as (typeof HEBREW_YEAR_VALUES)[number]) >=
    HEBREW_YEAR_VALUES.indexOf(graduationYear)
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
  if (v === INACTIVE_VIEW) {
    const inactive = students.filter((s) => s.status === StudentStatus.CANCELED_REGISTRATION);
    return cohortFilter ? inactive.filter((s) => s.cohortYear === cohortFilter) : inactive;
  }
  const byTrack = students.filter((s) => trackForDisplay(s) === v);
  return cohortFilter
    ? byTrack.filter((s) => s.cohortYear === cohortFilter)
    : byTrack.filter((s) => !isGraduatedStatus(s.status) && s.status !== StudentStatus.CANCELED_REGISTRATION);
}

export default function DashboardPage() {
  const { faculty } = useFaculty();
  const [view, setView] = useState<DashboardView>(StudentTrack.REGULAR);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<1 | 2 | "">("");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showGradesImport, setShowGradesImport] = useState(false);
  const [showRosterImport, setShowRosterImport] = useState(false);
  const [showBalanceImport, setShowBalanceImport] = useState(false);
  // Bumped per student id after the academic balance import writes to that
  // student, so their already-open card remounts and picks up the fresh
  // courseCategories instead of staying on whatever it had seeded at mount -
  // see StudentCard's own doc comment on why it never re-syncs on its own.
  const [refreshTokens, setRefreshTokens] = useState<Record<string, number>>({});

  useEffect(() => {
    setStudentsLoaded(false);
    const unsubscribe = subscribeStudents(faculty, (data) => {
      setStudents(data);
      setStudentsLoaded(true);
    });
    return unsubscribe;
  }, [faculty]);

  // Needed to look up a student's original candidate record for their
  // required קורסי השלמה - see lib/completionCourses.ts.
  useEffect(() => {
    setCandidatesLoaded(false);
    const unsubscribe = subscribeCandidates(faculty, (data) => {
      setCandidates(data);
      setCandidatesLoaded(true);
    });
    return unsubscribe;
  }, [faculty]);

  const countForView = (v: DashboardView) => studentsForView(students, v, cohortFilter).length;

  // A בהשלמה student who now has grades for every required קורס השלמה, or an
  // ACTIVE student whose coursework/נ"ז are now fully done, both need the
  // coordinator to come decide her status - surfaced as a dot on the
  // relevant tab (persists until dealt with) plus a one-shot toast (see
  // CompletionAttentionToast/useOneShotAttentionAlerts).
  const { pendingCount: completionAttentionCount, toasts: completionToasts, dismissToast: dismissCompletionToast } =
    useCompletionAttentionAlerts(students, candidates, studentsLoaded && candidatesLoaded);
  const { pendingCount: activeAttentionCount, toasts: activeToasts, dismissToast: dismissActiveToast } =
    useActiveGraduationAttentionAlerts(students, studentsLoaded);

  function dismissAttentionToast(id: string) {
    dismissCompletionToast(id);
    dismissActiveToast(id);
  }

  const viewOptions = useMemo(
    () => [
      {
        value: StudentTrack.REGULAR,
        label: `${he.dashboard.tabs[StudentTrack.REGULAR]} (${countForView(StudentTrack.REGULAR)})`,
        badge: activeAttentionCount > 0,
      },
      {
        value: StudentTrack.COMPLETION,
        label: `${he.dashboard.tabs[StudentTrack.COMPLETION]} (${countForView(StudentTrack.COMPLETION)})`,
        badge: completionAttentionCount > 0,
      },
      { value: GRADUATED_VIEW, label: `${he.dashboard.graduatesTab} (${countForView(GRADUATED_VIEW)})` },
      { value: INACTIVE_VIEW, label: `${he.dashboard.inactiveTab} (${countForView(INACTIVE_VIEW)})` },
    ],
    [students, cohortFilter, completionAttentionCount, activeAttentionCount]
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
    const views: DashboardView[] = [StudentTrack.REGULAR, StudentTrack.COMPLETION, GRADUATED_VIEW, INACTIVE_VIEW];
    return views.flatMap((v) => studentsForView(students, v, cohortFilter));
  }, [students, cohortFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{he.menu.overview}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center gap-1 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <span aria-hidden>+</span> {he.dashboard.addStudent}
          </button>
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

      <div className="flex flex-wrap items-center gap-3">
        <TrackTabs value={view} onChange={setView} options={viewOptions} />
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{he.dashboard.cohortFilterAll}</option>
          {/* תשפ"ג excluded - the system's first tracked מחזור isn't a
              meaningful filter choice, same reasoning as excluding it from
              the graduation-year picker (see GRADUATION_YEAR_VALUES). */}
          {[...HEBREW_YEAR_VALUES]
            .filter((y) => y !== "תשפג")
            .reverse()
            .map((y) => (
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
      <StudentsCardGrid
        students={visibleStudents}
        allStudents={searchableStudents}
        candidates={candidates}
        refreshTokens={refreshTokens}
      />

      {showAddStudent && (
        <AddStudentModal faculty={faculty} onClose={() => setShowAddStudent(false)} onCreated={() => {}} />
      )}

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
          onDone={(studentId) =>
            setRefreshTokens((prev) => ({ ...prev, [studentId]: (prev[studentId] ?? 0) + 1 }))
          }
        />
      )}

      <CompletionAttentionToast
        toasts={[...completionToasts, ...activeToasts]}
        onDismiss={dismissAttentionToast}
      />
    </div>
  );
}
