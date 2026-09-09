"use client";

import { useState } from "react";
import {
  buildDefaultCourseCategories,
  buildDefaultMilestones,
  CourseCompletionCategory,
  CourseCompletionEntry,
  he,
  isCourseworkComplete,
  MilestoneProgress,
  Student,
  StudentStatus,
} from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";
import { StudentDetailModal } from "./StudentDetailModal";

const STATUS_STYLES: Record<StudentStatus, string> = {
  [StudentStatus.ACTIVE]: "bg-green-100 text-green-800",
  [StudentStatus.REGISTERED]: "bg-blue-100 text-blue-800",
  [StudentStatus.REJECTED]: "bg-red-100 text-red-800",
  [StudentStatus.CANCELED]: "bg-gray-200 text-gray-700",
};

export function StudentCard({ student }: { student: Student }) {
  // Local draft, seeded once from the live doc and not re-synced from props
  // afterwards - subscribeStudents' onSnapshot would otherwise clobber
  // whatever the coordinator is mid-typing every time this card's own PATCH
  // echoes back. Fine for this tool's scale (one coordinator editing a card
  // at a time); a remount (e.g. the search filter removing/re-adding this
  // card) re-seeds from the latest doc anyway.
  const [milestones, setMilestones] = useState<MilestoneProgress[]>(
    () => student.milestones ?? buildDefaultMilestones(student.faculty)
  );
  const [courseCategories, setCourseCategories] = useState<CourseCompletionCategory[]>(
    () => student.courseCategories ?? buildDefaultCourseCategories(student.faculty)
  );
  const [projectTitle, setProjectTitle] = useState(student.projectTitle ?? "");
  const [supervisorName, setSupervisorName] = useState(student.supervisorName ?? "");
  const [finalGrade, setFinalGrade] = useState(student.finalGrade != null ? String(student.finalGrade) : "");
  const [showDetail, setShowDetail] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showClearanceComingSoon, setShowClearanceComingSoon] = useState(false);

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

  function updateCategory(categoryKey: string, entries: CourseCompletionEntry[]) {
    const next = courseCategories.map((c) => (c.key === categoryKey ? { ...c, entries } : c));
    setCourseCategories(next);
    save({ courseCategories: next });
  }

  const complete = isCourseworkComplete(courseCategories);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-900">{student.fullName}</h3>
          <p className="text-xs text-gray-500" dir="ltr">
            {student.idNumber}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[student.status]}`}>
          {he.status[student.status]}
        </span>
      </div>

      <section className="rounded-lg border border-gray-100 bg-gray-50 p-3">
        <h4 className="mb-2 text-xs font-semibold text-gray-700">{he.studentCard.projectSection}</h4>
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

        {milestones.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {milestones.map((m) => (
              <label key={m.key} className="flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={m.done} onChange={() => toggleMilestone(m.key)} />
                {m.nameHe}
              </label>
            ))}
          </div>
        )}

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
        <CourseCategorySection key={category.key} category={category} onChange={(entries) => updateCategory(category.key, entries)} />
      ))}

      {saveError && <p className="text-xs text-red-600">{saveError}</p>}

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <button onClick={() => setShowDetail(true)} className="text-xs font-medium text-blue-700 hover:underline">
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

      {showDetail && <StudentDetailModal student={student} onClose={() => setShowDetail(false)} />}
    </div>
  );
}

function CourseCategorySection({
  category,
  onChange,
}: {
  category: CourseCompletionCategory;
  onChange: (entries: CourseCompletionEntry[]) => void;
}) {
  const passedCount = category.entries.filter((e) => e.passed).length;
  const requirement = category.requiredCredits
    ? `${passedCount}/${category.requiredCount} (מינ' ${category.requiredCredits} ${he.studentCard.credits})`
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
        <span>{category.label}</span>
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
            {category.fixedCatalog ? (
              <span className="flex-1 text-sm text-gray-800">{entry.name}</span>
            ) : (
              <input
                value={entry.name}
                onChange={(e) => updateEntry(i, { name: e.target.value })}
                placeholder={he.studentCard.courseName}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            )}
            <input
              type="number"
              value={entry.grade ?? ""}
              onChange={(e) => updateEntry(i, { grade: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder={he.studentCard.grade}
              className="w-16 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
            />
            {!category.fixedCatalog && (
              <>
                <input
                  type="number"
                  value={entry.credits ?? ""}
                  onChange={(e) =>
                    updateEntry(i, { credits: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                  placeholder={he.studentCard.credits}
                  className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-sm"
                />
                <button onClick={() => removeRow(i)} className="text-xs text-red-600 hover:underline">
                  {he.studentCard.removeCourse}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {!category.fixedCatalog && (
        <button onClick={addRow} className="mt-2 text-xs font-medium text-blue-700 hover:underline">
          + {he.studentCard.addCourse}
        </button>
      )}
    </section>
  );
}
