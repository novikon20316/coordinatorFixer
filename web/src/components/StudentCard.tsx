"use client";

import { useState } from "react";
import {
  buildDefaultCourseCategories,
  buildDefaultMilestones,
  CourseCategoryBalance,
  courseCategoryBalance,
  courseCategoryLabel,
  CourseCompletionCategory,
  CourseCompletionEntry,
  Faculty,
  hasCreditShortfall,
  hasFailingGrade,
  he,
  HebrewYear,
  isCourseCategoryComplete,
  isGraduatedStatus,
  isCourseworkComplete,
  MilestoneProgress,
  resolveCategoryRequiredCredits,
  SemesterRecord,
  Student,
  STUDENT_STATUS_VALUES,
  StudentStatus,
  studentCohortYearLabel,
  syncCourseCategoriesFromHistory,
} from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";
import { useDetailPanels } from "../context/DetailPanelsContext";
import { ProjectProgressSyncModal } from "./ProjectProgressSyncModal";

const STATUS_STYLES: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "bg-green-100 text-green-800",
  [StudentStatus.CANCELED_REGISTRATION]: "bg-gray-200 text-gray-700",
  [StudentStatus.INTERNAL_MAPPING]: "bg-slate-200 text-slate-700",
  [StudentStatus.NOT_REGULAR]: "bg-orange-100 text-orange-800",
  [StudentStatus.CONDITIONAL]: "bg-yellow-100 text-yellow-800",
  [StudentStatus.ON_LEAVE]: "bg-blue-100 text-blue-800",
  [StudentStatus.GRADUATED_ELIGIBLE]: "bg-purple-100 text-purple-800",
  [StudentStatus.GRADUATED_PENDING]: "bg-purple-50 text-purple-700",
};

let nextMilestoneId = 0;

export function StudentCard({
  student,
  requiredCompletionCourses = [],
  expanded,
  onToggleExpanded,
}: {
  student: Student;
  /** קורסי השלמה this student's original candidate record marked as
   *  required (only when that candidate was admitted "על תנאי") - see
   *  web/src/lib/completionCourses.ts. */
  requiredCompletionCourses?: { name: string; grade?: number | string }[];
  /** Whether this card is showing its full details - owned by the parent
   *  grid (StudentsCardGrid) so collapsing/expanding one card doesn't
   *  remount the others. */
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  // Local draft, seeded once from the live doc and not re-synced from props
  // afterwards - subscribeStudents' onSnapshot would otherwise clobber
  // whatever the coordinator is mid-typing every time this card's own PATCH
  // echoes back. Fine for this tool's scale (one coordinator editing a card
  // at a time); a remount (e.g. the search filter removing/re-adding this
  // card) re-seeds from the latest doc anyway.
  const [milestones, setMilestones] = useState<MilestoneProgress[]>(
    () => student.milestones ?? buildDefaultMilestones(student.faculty)
  );
  const [courseCategories, setCourseCategories] = useState<CourseCompletionCategory[]>(() =>
    syncCourseCategoriesFromHistory(
      student.courseCategories ?? buildDefaultCourseCategories(student.faculty),
      student.academicHistory
    )
  );
  const [projectTitle, setProjectTitle] = useState(student.projectTitle ?? "");
  const [supervisorName, setSupervisorName] = useState(student.supervisorName ?? "");
  const [finalGrade, setFinalGrade] = useState(student.finalGrade != null ? String(student.finalGrade) : "");
  const [gpa, setGpa] = useState(student.gpa != null ? String(student.gpa) : "");
  const { openDetail } = useDetailPanels();
  const [showMissing, setShowMissing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showClearanceComingSoon, setShowClearanceComingSoon] = useState(false);
  const [showProgressSync, setShowProgressSync] = useState(false);

  async function save(patch: Partial<Student>) {
    setSaveError(null);
    try {
      await apiFetch(`/api/students/${student.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : he.common.error);
    }
  }

  function toggleMilestone(key: string) {
    const next = milestones.map((m) => (m.key === key ? { ...m, done: !m.done } : m));
    setMilestones(next);
    save({ milestones: next });
  }

  function renameMilestone(key: string, nameHe: string) {
    const next = milestones.map((m) => (m.key === key ? { ...m, nameHe } : m));
    setMilestones(next);
  }

  function commitMilestones() {
    save({ milestones });
  }

  // Project requirements (and so the milestone checklist) vary per project
  // even when two students' project titles happen to match - milestones
  // live per-student rather than by a shared project catalog, so the
  // coordinator can freely add/rename/remove entries to match this
  // student's actual project.
  function addMilestone() {
    const next = [...milestones, { key: `custom_${nextMilestoneId++}`, nameHe: "", nameEn: "", done: false }];
    setMilestones(next);
    save({ milestones: next });
  }

  function removeMilestone(key: string) {
    const next = milestones.filter((m) => m.key !== key);
    setMilestones(next);
    save({ milestones: next });
  }

  function updateCategory(categoryKey: string, entries: CourseCompletionEntry[]) {
    const next = courseCategories.map((c) => (c.key === categoryKey ? { ...c, entries } : c));
    setCourseCategories(next);
    save({ courseCategories: next });
  }

  function changeStatus(status: StudentStatus) {
    save({ status });
  }

  const complete = isCourseworkComplete(courseCategories);
  const missingCategories = courseCategories.filter((c) => !isCourseCategoryComplete(c));
  const missingMilestones = milestones.filter((m) => !m.done);
  const nothingMissing = missingCategories.length === 0 && missingMilestones.length === 0;
  const failedGrade = hasFailingGrade(courseCategories, student.academicHistory);
  const creditShortfall = hasCreditShortfall(courseCategories, student.faculty, student.cohortYear);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? he.studentCard.collapse : he.studentCard.expand}
          className="flex flex-1 items-start gap-2 text-right"
        >
          <span
            className={`mt-1 inline-block text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▶
          </span>
          <div>
            <h3 className="font-bold text-gray-900">{student.fullName}</h3>
            <p className="text-xs text-gray-500" dir="ltr">
              {student.idNumber}
            </p>
            {student.cohortYear && (
              <p className="mt-1 text-xs text-gray-500">
                {he.studentCard.startYear}: {studentCohortYearLabel(student.cohortYear, student.status, student.track)}
              </p>
            )}
            {isGraduatedStatus(student.status) && student.graduationYear && (
              <p className="mt-1 text-xs text-gray-500">
                {he.studentCard.graduationYear}: {student.graduationYear}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                {he.studentCard.gpaBadgeLabel}: {student.gpa || "—"}
              </span>
              {!complete && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  {he.studentCard.missingCoursesBadge}
                </span>
              )}
              {failedGrade && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
                  {he.studentCard.failedCourseBadge}
                </span>
              )}
              {creditShortfall && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                  {he.studentCard.creditShortfallBadge}
                </span>
              )}
            </div>
          </div>
        </button>
        <select
          value={student.status}
          onChange={(e) => changeStatus(e.target.value as StudentStatus)}
          className={`shrink-0 rounded-full border-0 px-3 py-1 text-xs font-semibold ${STATUS_STYLES[student.status]}`}
        >
          {STUDENT_STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {he.status[s]}
            </option>
          ))}
        </select>
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-3">
          <label className="flex w-48 flex-col gap-1 text-xs text-gray-600">
            {he.studentCard.degreeGpa}
            <input
              type="number"
              min={0}
              max={100}
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              onBlur={() => save({ gpa: gpa === "" ? 0 : Number(gpa) })}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-semibold"
            />
            <span className="text-[11px] text-gray-400">{he.studentCard.degreeGpaHint}</span>
          </label>

          <section className="rounded-lg border border-gray-100 p-3">
            <button
              type="button"
              onClick={() => setShowMissing((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-gray-700"
            >
              <span>{he.studentCard.missingForCompletion}</span>
              <span className={complete ? "text-green-700" : "text-amber-700"}>
                {complete ? "✓" : missingCategories.length + (missingMilestones.length > 0 ? 1 : 0)}
              </span>
            </button>
            {showMissing &&
              (nothingMissing ? (
                <p className="mt-2 text-xs text-green-700">{he.studentCard.nothingMissing}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1 text-xs text-amber-800">
                  {missingCategories.map((c) => {
                    const passedCount = c.entries.filter((e) => e.passed).length;
                    return (
                      <li key={c.key}>
                        {he.studentCard.missingCourseCategory
                          .replace("{label}", courseCategoryLabel(c))
                          .replace("{remaining}", String(c.requiredCount - passedCount))}
                      </li>
                    );
                  })}
                  {missingMilestones.length > 0 && (
                    <li>
                      {he.studentCard.missingMilestonesLabel}:{" "}
                      {missingMilestones
                        .map((m) => m.nameHe || m.nameEn)
                        .filter(Boolean)
                        .join(", ")}
                    </li>
                  )}
                </ul>
              ))}
          </section>

          {requiredCompletionCourses.length > 0 && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <h4 className="mb-2 text-xs font-semibold text-amber-800">{he.studentCard.requiredCompletionCourses}</h4>
              <div className="flex flex-wrap gap-2">
                {requiredCompletionCourses.map((c, i) => (
                  <span key={i} className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-gray-800">
                    {c.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-gray-700">{he.studentCard.projectSection}</h4>
              <button
                type="button"
                onClick={() => setShowProgressSync(true)}
                className="text-xs font-medium text-blue-700 hover:underline"
              >
                {he.projectProgressSync.syncButton}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={() => save({ projectTitle })}
                placeholder={he.studentCard.projectTitle}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              />
              <input
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                onBlur={() => save({ supervisorName })}
                placeholder={he.studentCard.supervisorName}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              />
            </div>

            <div className="mt-3">
              <h5 className="mb-1 text-xs font-semibold text-gray-500">{he.studentCard.milestones}</h5>
              <div className="flex flex-col gap-1">
                {milestones.map((m) => (
                  <div key={m.key} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={m.done} onChange={() => toggleMilestone(m.key)} />
                    <input
                      value={m.nameHe}
                      onChange={(e) => renameMilestone(m.key, e.target.value)}
                      onBlur={commitMilestones}
                      placeholder={he.studentCard.milestoneNamePlaceholder}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
                    />
                    {/* Read-only - only ever filled by ProjectProgressSyncModal's
                        sync from organization-all-system, never typed by hand. */}
                    {m.grade != null && (
                      <span className="rounded-md bg-gray-100 px-1.5 py-1 text-xs text-gray-700" dir="ltr">
                        {m.grade}
                      </span>
                    )}
                    <button onClick={() => removeMilestone(m.key)} className="text-xs text-red-600 hover:underline">
                      {he.studentCard.removeMilestone}
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addMilestone} className="mt-1.5 text-xs font-medium text-blue-700 hover:underline">
                + {he.studentCard.addMilestone}
              </button>
            </div>

            <label className="mt-3 flex w-32 flex-col gap-1 text-xs text-gray-600">
              {he.studentCard.finalGrade}
              <input
                type="number"
                min={0}
                max={100}
                value={finalGrade}
                onChange={(e) => setFinalGrade(e.target.value)}
                onBlur={() => save({ finalGrade: finalGrade === "" ? undefined : Number(finalGrade) })}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              />
            </label>
          </section>

          {courseCategories.map((category) => (
            <CourseCategorySection
              key={category.key}
              category={category}
              faculty={student.faculty}
              cohortYear={student.cohortYear}
              onChange={(entries) => updateCategory(category.key, entries)}
            />
          ))}

          <AcademicHistorySection history={student.academicHistory} />

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}

          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <button onClick={() => openDetail(student)} className="text-xs font-medium text-blue-700 hover:underline">
              {he.studentCard.moreDetails}
            </button>
            {complete &&
              (showClearanceComingSoon ? (
                <span className="text-xs font-medium text-gray-500">{he.common.comingSoon}</span>
              ) : (
                <button
                  onClick={() => setShowClearanceComingSoon(true)}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                >
                  {he.studentCard.clearanceForm}
                </button>
              ))}
          </div>
        </div>
      )}

      {showProgressSync && (
        <ProjectProgressSyncModal
          student={student}
          onClose={() => setShowProgressSync(false)}
          onDone={() => setShowProgressSync(false)}
        />
      )}
    </div>
  );
}

function CourseCategorySection({
  category,
  faculty,
  cohortYear,
  onChange,
}: {
  category: CourseCompletionCategory;
  faculty: Faculty;
  cohortYear: HebrewYear | undefined;
  onChange: (entries: CourseCompletionEntry[]) => void;
}) {
  const requiredCredits = resolveCategoryRequiredCredits(faculty, cohortYear, category.key);
  const passedCount = category.entries.filter((e) => e.passed).length;
  const requirement = requiredCredits
    ? `${passedCount}/${category.requiredCount} (מינ' ${requiredCredits} ${he.studentCard.credits})`
    : `${passedCount}/${category.requiredCount}`;

  function updateEntry(index: number, patch: Partial<CourseCompletionEntry>) {
    const next = category.entries.map((e, i) => (i === index ? { ...e, ...patch } : e));
    onChange(next);
  }

  function addRow() {
    onChange([...category.entries, { name: "", passed: false }]);
  }

  function removeRow(index: number) {
    onChange(category.entries.filter((_, i) => i !== index));
  }

  return (
    <section className="rounded-lg border border-gray-100 p-3">
      <h4 className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
        <span>{courseCategoryLabel(category)}</span>
        <span className="text-gray-500">{requirement}</span>
      </h4>
      <div className="flex flex-col gap-1.5">
        {category.entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={entry.passed}
              onChange={(e) => updateEntry(i, { passed: e.target.checked })}
            />
            <input
              value={entry.name}
              onChange={(e) => updateEntry(i, { name: e.target.value })}
              placeholder={he.studentCard.courseName}
              title={category.fixedCatalog && i < category.requiredCount ? he.studentCard.oldCurriculumNameHint : undefined}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              type="number"
              value={entry.grade ?? ""}
              onChange={(e) => {
                // Filling in a grade marks the course passed by default - the
                // checkbox stays a real toggle, so a coordinator who enters a
                // failing grade (or just disagrees) can still uncheck it.
                const grade = e.target.value === "" ? undefined : Number(e.target.value);
                updateEntry(i, grade !== undefined ? { grade, passed: true } : { grade });
              }}
              placeholder={he.studentCard.grade}
              className="w-16 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
            />
            <input
              type="number"
              value={entry.credits ?? ""}
              onChange={(e) =>
                updateEntry(i, { credits: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              placeholder={he.studentCard.credits}
              className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
            />
            {(!category.fixedCatalog || i >= category.requiredCount) && (
              <button onClick={() => removeRow(i)} className="text-xs text-red-600 hover:underline">
                {he.studentCard.removeCourse}
              </button>
            )}
          </div>
        ))}
      </div>
      <button onClick={addRow} className="mt-2 text-xs font-medium text-blue-700 hover:underline">
        + {he.studentCard.addCourse}
      </button>
      <CourseCategoryBalanceRow balance={courseCategoryBalance(category, requiredCredits)} />
    </section>
  );
}

function CourseCategoryBalanceRow({ balance }: { balance: CourseCategoryBalance }) {
  return (
    <div className="mt-2 grid grid-cols-4 gap-1 rounded-md bg-gray-50 p-2 text-center text-[11px]">
      <div>
        <div className="font-semibold text-gray-700">{balance.required}</div>
        <div className="text-gray-500">{he.studentCard.balanceRequired}</div>
      </div>
      <div>
        <div className="font-semibold text-gray-700">{balance.learned}</div>
        <div className="text-gray-500">{he.studentCard.balanceLearned}</div>
      </div>
      <div>
        <div className="font-semibold text-gray-700">{balance.remaining}</div>
        <div className="text-gray-500">{he.studentCard.balanceRemaining}</div>
      </div>
      <div>
        <div className="font-semibold text-gray-700">{balance.average ?? "—"}</div>
        <div className="text-gray-500">{he.studentCard.balanceGrade}</div>
      </div>
    </div>
  );
}

/** Read-only view of a student's raw, imported per-semester grades - kept
 *  separate from the editable CourseCategorySection above by design (see
 *  the module comment on Student.academicHistory in shared/src/types/student.ts).
 *  Each course also shows its lecturer when known (see the History tab,
 *  web/src/app/(app)/history, for where that's filled in). */
function AcademicHistorySection({ history }: { history?: SemesterRecord[] }) {
  if (!history || history.length === 0) return null;

  const sorted = [...history].sort((a, b) =>
    a.yearOfStudy !== b.yearOfStudy ? a.yearOfStudy - b.yearOfStudy : a.semester.localeCompare(b.semester)
  );

  return (
    <section className="rounded-lg border border-gray-100 p-3">
      <h4 className="mb-2 text-xs font-semibold text-gray-700">{he.studentCard.academicHistorySection}</h4>
      <div className="flex flex-col gap-3">
        {sorted.map((record) => (
          <div key={`${record.yearOfStudy}-${record.semester}-${record.hebrewYear}`}>
            <p className="mb-1 text-xs font-medium text-gray-600">
              {he.studentCard.yearOfStudy[String(record.yearOfStudy) as "1" | "2"]} · {he.studentCard.semesterLabel[record.semester]} ·{" "}
              {record.hebrewYear}
              {record.semesterAverage != null && ` · ${he.studentCard.semesterAverage}: ${record.semesterAverage}`}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
              {record.courses.map((c, i) => (
                <span key={i} className="rounded-md bg-gray-50 px-2 py-0.5">
                  {c.name}: {c.grade ?? "—"}
                  {c.lecturer && <span className="text-gray-400"> · {he.studentCard.lecturer}: {c.lecturer}</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
