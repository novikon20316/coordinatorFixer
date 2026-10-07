"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cohortYearOptionLabel,
  expectedGraduationYear,
  Faculty,
  FACULTY_VALUES,
  HEBREW_YEAR_VALUES,
  he,
  isDueForGraduationReview,
  isGraduatedStatus,
  Student,
  STUDENT_STATUS_VALUES,
  STUDENT_TRACK_VALUES,
  studentCohortYearLabel,
  StudentStatus,
  StudentTrack,
  validGraduationYear,
} from "@admin-coordinator/shared";
import { subscribeStudents } from "../../../data/studentsRepository";
import { useFaculty } from "../../../context/FacultyContext";
import { StatusChangeModal, StatusUpdate } from "../../../components/StatusChangeModal";
import { BulkStatusChangeModal } from "../../../components/BulkStatusChangeModal";
import { ColumnFilterPopover } from "../../../components/ColumnFilterPopover";

function isDue(s: Student): boolean {
  return !!s.cohortYear && isDueForGraduationReview(s.cohortYear, s.status, s.track);
}

// The מחזור column's own displayed value: a graduated student shows their
// actual recorded graduationYear (once valid - see validGraduationYear)
// instead of the cohort they started in, same reasoning as the overview
// tab's own graduation-year display. Falling back to the raw cohortYear when
// no graduationYear is recorded would mislabel the student's FIRST year of
// study as their graduation year (e.g. a תשפ"ג cohort shown as "תשפ"ג
// (מוסמך)"), so the fallback is the two-years-later year the program's
// length (see yearOfStudy) actually implies instead. The cohort filter/sort
// below must use this SAME resolved value rather than the raw cohortYear, or
// filtering by a year wouldn't match what the column actually shows for a
// graduated student.
function displayCohortYear(s: Student) {
  if (isGraduatedStatus(s.status)) {
    const g = validGraduationYear(s.graduationYear);
    if (g) return g;
    const expected = s.cohortYear ? expectedGraduationYear(s.cohortYear) : undefined;
    if (expected) return expected;
  }
  return s.cohortYear;
}

// The מצב הרשמה column's own four-way state: a graduated student (either of
// the two isGraduatedStatus statuses) always shows as "GRADUATED" here
// regardless of their underlying track, since once certified the track they
// studied under is no longer the relevant fact for this column. Reuses
// he.status[GRADUATED_ELIGIBLE] ("מוסמך") for the label rather than
// duplicating the string. A student whose status is CANCELED_REGISTRATION
// always shows as "INACTIVE" ("לא פעיל"), checked before the graduated case
// since the two statuses never overlap anyway.
type RegistrationState = StudentTrack | "GRADUATED" | "INACTIVE";

function registrationStateOf(s: Student): RegistrationState {
  if (s.status === StudentStatus.CANCELED_REGISTRATION) return "INACTIVE";
  return isGraduatedStatus(s.status) ? "GRADUATED" : s.track;
}

function registrationStateLabel(state: RegistrationState): string {
  if (state === "GRADUATED") return he.status[StudentStatus.GRADUATED_ELIGIBLE];
  if (state === "INACTIVE") return he.changeStatus.registrationStateInactive;
  return he.dashboard.tabs[state];
}

const REGISTRATION_STATE_OPTIONS: { value: RegistrationState; label: string }[] = [
  { value: StudentTrack.REGULAR, label: he.dashboard.tabs[StudentTrack.REGULAR] },
  { value: StudentTrack.COMPLETION, label: he.dashboard.tabs[StudentTrack.COMPLETION] },
  { value: "GRADUATED", label: he.status[StudentStatus.GRADUATED_ELIGIBLE] },
  { value: "INACTIVE", label: he.changeStatus.registrationStateInactive },
];

const STATUS_OPTIONS: { value: StudentStatus; label: string }[] = STUDENT_STATUS_VALUES.map((s) => ({
  value: s,
  label: he.status[s],
}));

function sortIndicator(dir: "asc" | "desc" | null) {
  if (!dir) return null;
  return <span className="ms-1 inline-block">{dir === "asc" ? "▲" : "▼"}</span>;
}

/**
 * Filters + a list of students, with a click-to-change status action (any
 * role). A richer track-transition flow (e.g. what else should happen when
 * a student moves off בהשלמה) is still being decided - see
 * web/src/lib/completionCourses.ts's doc comment for how that's expected to
 * affect the dashboard once it exists; for now this only ever changes
 * `status` directly.
 */
export default function ChangeStatusPage() {
  const { faculty, setFaculty, canChangeFaculty } = useFaculty();
  const [students, setStudents] = useState<Student[]>([]);
  const [trackFilter, setTrackFilter] = useState<StudentTrack | "">("");
  const [cohortFilter, setCohortFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [nameSort, setNameSort] = useState<"asc" | "desc" | null>(null);
  const [cohortSort, setCohortSort] = useState<"asc" | "desc" | null>(null);
  const [registrationStateFilter, setRegistrationStateFilter] = useState<RegistrationState[]>([]);
  const [statusFilter, setStatusFilter] = useState<StudentStatus[]>([]);
  const [openColumnFilter, setOpenColumnFilter] = useState<"registrationState" | "status" | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeStudents(faculty, setStudents);
    return unsubscribe;
  }, [faculty]);

  // Filters/sort are local UI state, not something the coordinator expects
  // to carry over between visits - reset them fresh every time this page
  // mounts (e.g. navigating here from another tab), not just when faculty
  // changes.
  useEffect(() => {
    resetFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetFilters() {
    setTrackFilter("");
    setCohortFilter("");
    setSearch("");
    setDueOnly(false);
    setRegistrationStateFilter([]);
    setStatusFilter([]);
    setNameSort(null);
    setCohortSort(null);
    setOpenColumnFilter(null);
  }

  const hasActiveFilters =
    !!trackFilter ||
    !!cohortFilter ||
    !!search ||
    dueOnly ||
    registrationStateFilter.length > 0 ||
    statusFilter.length > 0 ||
    !!nameSort ||
    !!cohortSort;

  const dueCount = useMemo(() => students.filter(isDue).length, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = students
      .filter((s) => !trackFilter || s.track === trackFilter)
      .filter((s) => !cohortFilter || displayCohortYear(s) === cohortFilter)
      .filter((s) => !dueOnly || isDue(s))
      .filter((s) => !q || s.fullName.toLowerCase().includes(q) || s.idNumber?.toLowerCase().includes(q))
      .filter((s) => registrationStateFilter.length === 0 || registrationStateFilter.includes(registrationStateOf(s)))
      .filter((s) => statusFilter.length === 0 || statusFilter.includes(s.status));

    if (nameSort) {
      rows.sort((a, b) => (nameSort === "asc" ? 1 : -1) * a.fullName.localeCompare(b.fullName, "he"));
    } else if (cohortSort) {
      rows.sort((a, b) => {
        const ayear = displayCohortYear(a);
        const byear = displayCohortYear(b);
        const ai = ayear ? HEBREW_YEAR_VALUES.indexOf(ayear) : -1;
        const bi = byear ? HEBREW_YEAR_VALUES.indexOf(byear) : -1;
        return (cohortSort === "asc" ? 1 : -1) * (ai - bi);
      });
    } else {
      rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "he"));
    }

    return rows;
  }, [students, trackFilter, cohortFilter, dueOnly, search, registrationStateFilter, statusFilter, nameSort, cohortSort]);

  function handleStatusChange(studentId: string, update: StatusUpdate) {
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, ...update } : s)));
  }

  function toggleNameSort() {
    setCohortSort(null);
    setNameSort((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function toggleCohortSort() {
    setNameSort(null);
    setCohortSort((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function applyRegistrationStateFilter(values: RegistrationState[]) {
    setRegistrationStateFilter(values);
    setNameSort(null);
    setCohortSort(null);
  }

  function applyStatusFilter(values: StudentStatus[]) {
    setStatusFilter(values);
    setNameSort(null);
    setCohortSort(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{he.changeStatus.title}</h1>

      <div className="flex flex-wrap items-center gap-3">
        {canChangeFaculty && (
          <select
            value={faculty}
            onChange={(e) => setFaculty(e.target.value as Faculty)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {FACULTY_VALUES.map((f) => (
              <option key={f} value={f}>
                {he.faculty[f]}
              </option>
            ))}
          </select>
        )}
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value as StudentTrack | "")}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{he.changeStatus.trackFilterAll}</option>
          {STUDENT_TRACK_VALUES.map((t) => (
            <option key={t} value={t}>
              {he.dashboard.tabs[t]}
            </option>
          ))}
        </select>
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{he.dashboard.cohortFilterAll}</option>
          {HEBREW_YEAR_VALUES.map((y) => (
            <option key={y} value={y}>
              {cohortYearOptionLabel(y)}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={he.dashboard.searchPlaceholder}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
          {he.changeStatus.dueForReviewFilter.replace("{count}", String(dueCount))}
        </label>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {he.changeStatus.resetFilters}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">{he.changeStatus.clickToChange}</p>
        {filtered.length > 0 && (
          <button
            onClick={() => setBulkOpen(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {he.changeStatus.bulkUpdateButton.replace("{count}", String(filtered.length))}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th
                onClick={toggleNameSort}
                className="cursor-pointer select-none px-4 py-2 text-right font-medium hover:text-gray-700"
              >
                {he.table.columns.fullName}
                {sortIndicator(nameSort)}
              </th>
              <th className="px-4 py-2 text-right font-medium">{he.table.columns.idNumber}</th>
              <th
                onClick={toggleCohortSort}
                className="cursor-pointer select-none px-4 py-2 text-right font-medium hover:text-gray-700"
              >
                {he.table.columns.cohortYear}
                {sortIndicator(cohortSort)}
              </th>
              <th className="relative px-4 py-2 text-right font-medium">
                <button
                  type="button"
                  data-column-filter-trigger
                  onClick={() => setOpenColumnFilter((prev) => (prev === "registrationState" ? null : "registrationState"))}
                  className="flex w-full cursor-pointer items-center justify-end gap-1 font-medium hover:text-gray-700"
                >
                  {he.studentForm.track}
                  {registrationStateFilter.length > 0 && (
                    <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">
                      {registrationStateFilter.length}
                    </span>
                  )}
                </button>
                {openColumnFilter === "registrationState" && (
                  <ColumnFilterPopover
                    options={REGISTRATION_STATE_OPTIONS}
                    selected={registrationStateFilter}
                    onApply={applyRegistrationStateFilter}
                    onClose={() => setOpenColumnFilter(null)}
                  />
                )}
              </th>
              <th className="relative px-4 py-2 text-right font-medium">
                <button
                  type="button"
                  data-column-filter-trigger
                  onClick={() => setOpenColumnFilter((prev) => (prev === "status" ? null : "status"))}
                  className="flex w-full cursor-pointer items-center justify-end gap-1 font-medium hover:text-gray-700"
                >
                  {he.table.columns.status}
                  {statusFilter.length > 0 && (
                    <span className="rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">
                      {statusFilter.length}
                    </span>
                  )}
                </button>
                {openColumnFilter === "status" && (
                  <ColumnFilterPopover
                    options={STATUS_OPTIONS}
                    selected={statusFilter}
                    onApply={applyStatusFilter}
                    onClose={() => setOpenColumnFilter(null)}
                  />
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((s) => (
              <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-900">{s.fullName}</td>
                <td className="px-4 py-2 text-gray-600" dir="ltr">
                  {s.idNumber || "—"}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {(() => {
                    const displayYear = displayCohortYear(s);
                    return displayYear ? studentCohortYearLabel(displayYear, s.status, s.track) : "—";
                  })()}
                </td>
                <td className="px-4 py-2 text-gray-600">{registrationStateLabel(registrationStateOf(s))}</td>
                <td className="px-4 py-2 text-gray-600">
                  {he.status[s.status]}
                  {isDue(s) && (
                    <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {he.changeStatus.dueForReviewBadge}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && <div className="py-16 text-center text-gray-500">{he.common.noData}</div>}
      </div>

      {selected && (
        <StatusChangeModal student={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
      )}

      {bulkOpen && (
        <BulkStatusChangeModal students={filtered} onClose={() => setBulkOpen(false)} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
