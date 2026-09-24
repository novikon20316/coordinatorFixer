"use client";

import { useEffect, useState } from "react";
import {
  buildDefaultCourseCategories,
  cohortYearOptionLabel,
  CourseCategoryKey,
  courseCategoryKeyLabel,
  CourseCompletionCategory,
  CurriculumCategoryRule,
  DATA_SCIENCE_CORE_CURRICULUM_COURSES,
  Faculty,
  he,
  HEBREW_YEAR_VALUES,
  HebrewYear,
  moveCourseCategoryEntry,
  removeCoreCurriculumCourse,
  restoreCoreCurriculumCourseFromHistory,
  setCoreCurriculumCourseCredits,
  Student,
  UserRole,
} from "@admin-coordinator/shared";
import { useAuth } from "../../../context/AuthContext";
import { apiFetch } from "../../../lib/apiClient";
import { subscribeStudents } from "../../../data/studentsRepository";

function inCohortRange(cohortYear: HebrewYear | undefined, from: HebrewYear, to: HebrewYear): boolean {
  if (!cohortYear) return false;
  const idx = HEBREW_YEAR_VALUES.indexOf(cohortYear);
  return idx >= HEBREW_YEAR_VALUES.indexOf(from) && idx <= HEBREW_YEAR_VALUES.indexOf(to);
}

interface ExemptRow {
  student: Student;
  categories: CourseCompletionCategory[];
  skippedGraded: boolean;
}

interface CreditsRow {
  student: Student;
  categories: CourseCompletionCategory[];
  currentCredits: number | undefined;
}

interface RestoreRow {
  student: Student;
  categories: CourseCompletionCategory[];
  grade: number | undefined;
}

function CohortRangeSelect({
  from,
  to,
  onChangeFrom,
  onChangeTo,
}: {
  from: HebrewYear;
  to: HebrewYear;
  onChangeFrom: (y: HebrewYear) => void;
  onChangeTo: (y: HebrewYear) => void;
}) {
  return (
    <div className="flex gap-3">
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {he.curriculumCorrections.cohortFromLabel}
        <select
          value={from}
          onChange={(e) => onChangeFrom(e.target.value as HebrewYear)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {HEBREW_YEAR_VALUES.map((y) => (
            <option key={y} value={y}>
              {cohortYearOptionLabel(y)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {he.curriculumCorrections.cohortToLabel}
        <select
          value={to}
          onChange={(e) => onChangeTo(e.target.value as HebrewYear)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {HEBREW_YEAR_VALUES.map((y) => (
            <option key={y} value={y}>
              {cohortYearOptionLabel(y)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ExemptCourseSection({ students }: { students: Student[] }) {
  const [course, setCourse] = useState("עיבוד שפה טבעית");
  const [from, setFrom] = useState<HebrewYear>("תשפג");
  const [to, setTo] = useState<HebrewYear>("תשפה");
  const [preview, setPreview] = useState<ExemptRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ count: number; failures: string[] } | null>(null);

  function runPreview() {
    setResult(null);
    const rows: ExemptRow[] = [];
    for (const s of students) {
      if (!inCohortRange(s.cohortYear, from, to)) continue;
      const outcome = removeCoreCurriculumCourse(
        s.courseCategories ?? buildDefaultCourseCategories(Faculty.DATA_SCIENCE),
        course,
        s.academicHistory
      );
      if (outcome.removed) rows.push({ student: s, categories: outcome.categories, skippedGraded: false });
      else if (outcome.skippedGraded) rows.push({ student: s, categories: outcome.categories, skippedGraded: true });
    }
    setPreview(rows);
    setSelected(new Set(rows.filter((r) => !r.skippedGraded).map((r) => r.student.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply() {
    if (!preview) return;
    const targets = preview.filter((r) => !r.skippedGraded && selected.has(r.student.id));
    setApplying(true);
    const failures: string[] = [];
    await Promise.all(
      targets.map(async (r) => {
        try {
          await apiFetch(`/api/students/${r.student.id}`, {
            method: "PATCH",
            body: JSON.stringify({ courseCategories: r.categories }),
          });
        } catch {
          failures.push(r.student.fullName);
        }
      })
    );
    setApplying(false);
    setResult({ count: targets.length - failures.length, failures });
    setPreview(null);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-gray-900">{he.curriculumCorrections.exemptSectionTitle}</h2>
      <p className="mt-1 text-xs text-gray-500">{he.curriculumCorrections.exemptSectionDescription}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.courseLabel}
          <select
            value={course}
            onChange={(e) => {
              setCourse(e.target.value);
              setPreview(null);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {DATA_SCIENCE_CORE_CURRICULUM_COURSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <CohortRangeSelect
          from={from}
          to={to}
          onChangeFrom={(y) => {
            setFrom(y);
            setPreview(null);
          }}
          onChangeTo={(y) => {
            setTo(y);
            setPreview(null);
          }}
        />
        <button
          onClick={runPreview}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {he.curriculumCorrections.previewButton}
        </button>
      </div>

      {result && (
        <p className="mt-3 text-sm text-green-700">
          {he.curriculumCorrections.exemptResultSummary.replace("{count}", String(result.count))}
          {result.failures.length > 0 && (
            <span className="block text-red-600">
              {he.curriculumCorrections.failuresSummary.replace("{names}", result.failures.join(", "))}
            </span>
          )}
        </p>
      )}

      {preview && (
        <div className="mt-4">
          {preview.length === 0 ? (
            <p className="text-sm text-gray-500">{he.curriculumCorrections.noneAffected}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-1">
                {preview.map((r) => (
                  <li key={r.student.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={r.skippedGraded}
                      checked={selected.has(r.student.id)}
                      onChange={() => toggle(r.student.id)}
                    />
                    <span className={r.skippedGraded ? "text-gray-400" : "text-gray-800"}>
                      {r.student.fullName} ({r.student.cohortYear})
                    </span>
                    {r.skippedGraded && (
                      <span className="text-xs text-amber-700">{he.curriculumCorrections.skippedGradedNote}</span>
                    )}
                  </li>
                ))}
              </ul>
              <button
                onClick={apply}
                disabled={applying || selected.size === 0}
                className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {applying
                  ? he.curriculumCorrections.applying
                  : he.curriculumCorrections.applyButton.replace("{count}", String(selected.size))}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function CourseCreditsSection({ students }: { students: Student[] }) {
  const [course, setCourse] = useState("למידה עמוקה");
  const [from, setFrom] = useState<HebrewYear>("תשפג");
  const [to, setTo] = useState<HebrewYear>("תשפה");
  const [credits, setCredits] = useState("3.5");
  const [preview, setPreview] = useState<CreditsRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ count: number; failures: string[] } | null>(null);

  function runPreview() {
    setResult(null);
    const value = Number(credits);
    if (!Number.isFinite(value)) return;
    const rows: CreditsRow[] = [];
    for (const s of students) {
      if (!inCohortRange(s.cohortYear, from, to)) continue;
      const base = s.courseCategories ?? buildDefaultCourseCategories(Faculty.DATA_SCIENCE);
      const outcome = setCoreCurriculumCourseCredits(base, course, value);
      if (outcome.changed) {
        const currentEntry = base
          .find((c) => c.key === "core_curriculum")
          ?.entries.find((e) => e.name === course);
        rows.push({ student: s, categories: outcome.categories, currentCredits: currentEntry?.credits });
      }
    }
    setPreview(rows);
    setSelected(new Set(rows.map((r) => r.student.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply() {
    if (!preview) return;
    const targets = preview.filter((r) => selected.has(r.student.id));
    setApplying(true);
    const failures: string[] = [];
    await Promise.all(
      targets.map(async (r) => {
        try {
          await apiFetch(`/api/students/${r.student.id}`, {
            method: "PATCH",
            body: JSON.stringify({ courseCategories: r.categories }),
          });
        } catch {
          failures.push(r.student.fullName);
        }
      })
    );
    setApplying(false);
    setResult({ count: targets.length - failures.length, failures });
    setPreview(null);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-gray-900">{he.curriculumCorrections.creditsSectionTitle}</h2>
      <p className="mt-1 text-xs text-gray-500">{he.curriculumCorrections.creditsSectionDescription}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.courseLabel}
          <select
            value={course}
            onChange={(e) => {
              setCourse(e.target.value);
              setPreview(null);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {DATA_SCIENCE_CORE_CURRICULUM_COURSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <CohortRangeSelect
          from={from}
          to={to}
          onChangeFrom={(y) => {
            setFrom(y);
            setPreview(null);
          }}
          onChangeTo={(y) => {
            setTo(y);
            setPreview(null);
          }}
        />
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.newCreditsLabel}
          <input
            type="number"
            step={0.5}
            min={0}
            value={credits}
            onChange={(e) => {
              setCredits(e.target.value);
              setPreview(null);
            }}
            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={runPreview}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {he.curriculumCorrections.previewButton}
        </button>
      </div>

      {result && (
        <p className="mt-3 text-sm text-green-700">
          {he.curriculumCorrections.creditsResultSummary.replace("{count}", String(result.count))}
          {result.failures.length > 0 && (
            <span className="block text-red-600">
              {he.curriculumCorrections.failuresSummary.replace("{names}", result.failures.join(", "))}
            </span>
          )}
        </p>
      )}

      {preview && (
        <div className="mt-4">
          {preview.length === 0 ? (
            <p className="text-sm text-gray-500">{he.curriculumCorrections.noneAffected}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-1">
                {preview.map((r) => (
                  <li key={r.student.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.has(r.student.id)} onChange={() => toggle(r.student.id)} />
                    <span className="text-gray-800">
                      {r.student.fullName} ({r.student.cohortYear})
                    </span>
                    <span className="text-xs text-gray-500">
                      {he.curriculumCorrections.currentCredits}: {r.currentCredits ?? "—"} →{" "}
                      {he.curriculumCorrections.newCredits}: {credits}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={apply}
                disabled={applying || selected.size === 0}
                className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {applying
                  ? he.curriculumCorrections.applying
                  : he.curriculumCorrections.applyButton.replace("{count}", String(selected.size))}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function RestoreCourseSection({ students }: { students: Student[] }) {
  const [course, setCourse] = useState(DATA_SCIENCE_CORE_CURRICULUM_COURSES[0]);
  const [preview, setPreview] = useState<RestoreRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ count: number; failures: string[] } | null>(null);

  function runPreview() {
    setResult(null);
    const rows: RestoreRow[] = [];
    for (const s of students) {
      const outcome = restoreCoreCurriculumCourseFromHistory(
        s.courseCategories ?? buildDefaultCourseCategories(Faculty.DATA_SCIENCE),
        course,
        s.academicHistory
      );
      if (outcome.restored) rows.push({ student: s, categories: outcome.categories, grade: outcome.grade });
    }
    setPreview(rows);
    setSelected(new Set(rows.map((r) => r.student.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply() {
    if (!preview) return;
    const targets = preview.filter((r) => selected.has(r.student.id));
    setApplying(true);
    const failures: string[] = [];
    await Promise.all(
      targets.map(async (r) => {
        try {
          await apiFetch(`/api/students/${r.student.id}`, {
            method: "PATCH",
            body: JSON.stringify({ courseCategories: r.categories }),
          });
        } catch {
          failures.push(r.student.fullName);
        }
      })
    );
    setApplying(false);
    setResult({ count: targets.length - failures.length, failures });
    setPreview(null);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-gray-900">{he.curriculumCorrections.restoreSectionTitle}</h2>
      <p className="mt-1 text-xs text-gray-500">{he.curriculumCorrections.restoreSectionDescription}</p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.courseLabel}
          <select
            value={course}
            onChange={(e) => {
              setCourse(e.target.value);
              setPreview(null);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {DATA_SCIENCE_CORE_CURRICULUM_COURSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={runPreview}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {he.curriculumCorrections.previewButton}
        </button>
      </div>

      {result && (
        <p className="mt-3 text-sm text-green-700">
          {he.curriculumCorrections.restoreResultSummary.replace("{count}", String(result.count))}
          {result.failures.length > 0 && (
            <span className="block text-red-600">
              {he.curriculumCorrections.failuresSummary.replace("{names}", result.failures.join(", "))}
            </span>
          )}
        </p>
      )}

      {preview && (
        <div className="mt-4">
          {preview.length === 0 ? (
            <p className="text-sm text-gray-500">{he.curriculumCorrections.noneAffected}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-1">
                {preview.map((r) => (
                  <li key={r.student.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.has(r.student.id)} onChange={() => toggle(r.student.id)} />
                    <span className="text-gray-800">
                      {r.student.fullName} ({r.student.cohortYear})
                    </span>
                    <span className="text-xs text-gray-500">
                      {he.studentCard.grade}: {r.grade}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={apply}
                disabled={applying || selected.size === 0}
                className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {applying
                  ? he.curriculumCorrections.applying
                  : he.curriculumCorrections.applyButton.replace("{count}", String(selected.size))}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

interface MoveRow {
  student: Student;
  categories: CourseCompletionCategory[];
}

const MOVE_TARGETS: Record<CourseCategoryKey, Exclude<CourseCategoryKey, "core_curriculum">[]> = {
  core_curriculum: ["core", "elective"],
  core: ["elective"],
  elective: ["core"],
};

function MoveCourseCategorySection({ students }: { students: Student[] }) {
  const [rules, setRules] = useState<CurriculumCategoryRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [fromCategory, setFromCategory] = useState<CourseCategoryKey>("core_curriculum");
  const [course, setCourse] = useState(DATA_SCIENCE_CORE_CURRICULUM_COURSES[0]);
  const [toCategory, setToCategory] = useState<Exclude<CourseCategoryKey, "core_curriculum">>("core");
  const [effectiveFromCohort, setEffectiveFromCohort] = useState<HebrewYear>(
    HEBREW_YEAR_VALUES[HEBREW_YEAR_VALUES.length - 1]
  );
  const [preview, setPreview] = useState<MoveRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ count: number; failures: string[] } | null>(null);

  async function reloadRules() {
    setLoadingRules(true);
    setRulesError(null);
    try {
      const list = (await apiFetch(
        `/api/curriculum-category-rules?faculty=${Faculty.DATA_SCIENCE}`
      )) as CurriculumCategoryRule[];
      setRules(list);
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setLoadingRules(false);
    }
  }

  useEffect(() => {
    reloadRules();
  }, []);

  function changeFromCategory(next: CourseCategoryKey) {
    setFromCategory(next);
    setCourse(next === "core_curriculum" ? DATA_SCIENCE_CORE_CURRICULUM_COURSES[0] : "");
    setToCategory(MOVE_TARGETS[next][0]);
    setPreview(null);
  }

  function runPreview() {
    setResult(null);
    if (!course.trim()) return;
    const fromIndex = HEBREW_YEAR_VALUES.indexOf(effectiveFromCohort);
    const rows: MoveRow[] = [];
    for (const s of students) {
      const cohortIndex = s.cohortYear ? HEBREW_YEAR_VALUES.indexOf(s.cohortYear) : -1;
      if (cohortIndex < fromIndex) continue;
      const base = s.courseCategories ?? buildDefaultCourseCategories(Faculty.DATA_SCIENCE);
      const outcome = moveCourseCategoryEntry(base, course, fromCategory, toCategory);
      if (outcome.moved) rows.push({ student: s, categories: outcome.categories });
    }
    setPreview(rows);
    setSelected(new Set(rows.map((r) => r.student.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply() {
    if (!preview) return;
    const targets = preview.filter((r) => selected.has(r.student.id));
    setApplying(true);
    try {
      await apiFetch("/api/curriculum-category-rules", {
        method: "POST",
        body: JSON.stringify({ faculty: Faculty.DATA_SCIENCE, course, fromCategory, toCategory, effectiveFromCohort }),
      });
    } catch (err) {
      setApplying(false);
      setResult({ count: 0, failures: [err instanceof Error ? err.message : he.common.error] });
      return;
    }
    const failures: string[] = [];
    await Promise.all(
      targets.map(async (r) => {
        try {
          await apiFetch(`/api/students/${r.student.id}`, {
            method: "PATCH",
            body: JSON.stringify({ courseCategories: r.categories }),
          });
        } catch {
          failures.push(r.student.fullName);
        }
      })
    );
    setApplying(false);
    setResult({ count: targets.length - failures.length, failures });
    setPreview(null);
    reloadRules();
  }

  async function deleteRule(id: string) {
    await apiFetch(`/api/curriculum-category-rules/${id}`, { method: "DELETE" });
    reloadRules();
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="font-bold text-gray-900">{he.curriculumCorrections.moveSectionTitle}</h2>
      <p className="mt-1 text-xs text-gray-500">{he.curriculumCorrections.moveSectionDescription}</p>

      <div className="mt-4">
        <h3 className="text-xs font-semibold text-gray-700">{he.curriculumCorrections.existingRulesTitle}</h3>
        {rulesError && <p className="mt-1 text-xs text-red-600">{rulesError}</p>}
        {loadingRules ? (
          <p className="mt-1 text-xs text-gray-500">{he.common.loading}</p>
        ) : rules.length === 0 ? (
          <p className="mt-1 text-xs text-gray-500">{he.curriculumCorrections.noExistingRules}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-xs text-gray-700">
                <span>
                  {he.curriculumCorrections.ruleSummary
                    .replace("{course}", r.course)
                    .replace("{from}", courseCategoryKeyLabel(r.fromCategory))
                    .replace("{to}", courseCategoryKeyLabel(r.toCategory))
                    .replace("{cohort}", r.effectiveFromCohort)}
                </span>
                <button onClick={() => deleteRule(r.id)} className="text-red-600 hover:underline">
                  {he.curriculumCorrections.deleteRule}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.moveFromCategoryLabel}
          <select
            value={fromCategory}
            onChange={(e) => changeFromCategory(e.target.value as CourseCategoryKey)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {(["core_curriculum", "core", "elective"] as CourseCategoryKey[]).map((key) => (
              <option key={key} value={key}>
                {courseCategoryKeyLabel(key)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.courseLabel}
          {fromCategory === "core_curriculum" ? (
            <select
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setPreview(null);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {DATA_SCIENCE_CORE_CURRICULUM_COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setPreview(null);
              }}
              placeholder={he.curriculumCorrections.moveCourseFreeTextLabel}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          )}
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.moveToCategoryLabel}
          {MOVE_TARGETS[fromCategory].length > 1 ? (
            <select
              value={toCategory}
              onChange={(e) => {
                setToCategory(e.target.value as Exclude<CourseCategoryKey, "core_curriculum">);
                setPreview(null);
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {MOVE_TARGETS[fromCategory].map((key) => (
                <option key={key} value={key}>
                  {courseCategoryKeyLabel(key)}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {courseCategoryKeyLabel(toCategory)}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.curriculumCorrections.moveEffectiveFromLabel}
          <select
            value={effectiveFromCohort}
            onChange={(e) => {
              setEffectiveFromCohort(e.target.value as HebrewYear);
              setPreview(null);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {HEBREW_YEAR_VALUES.map((y) => (
              <option key={y} value={y}>
                {cohortYearOptionLabel(y)}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={runPreview}
          disabled={!course.trim()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {he.curriculumCorrections.previewButton}
        </button>
      </div>

      {result && (
        <p className="mt-3 text-sm text-green-700">
          {result.count === 0 && result.failures.length === 0
            ? he.curriculumCorrections.ruleSavedNoStudents
            : he.curriculumCorrections.moveResultSummary.replace("{count}", String(result.count))}
          {result.failures.length > 0 && (
            <span className="block text-red-600">
              {he.curriculumCorrections.failuresSummary.replace("{names}", result.failures.join(", "))}
            </span>
          )}
        </p>
      )}

      {preview && (
        <div className="mt-4">
          {preview.length === 0 ? (
            // Still lets the rule be saved with nothing selected below it - a
            // rule effective for a cohort with no current matching students
            // (e.g. one defined ahead of a new cohort even existing yet, or
            // for a course no current student happens to have typed under
            // this category) must still be creatable: it's what makes new
            // students built afterward get the new category from day one.
            <p className="text-sm text-gray-500">{he.curriculumCorrections.noneAffected}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {preview.map((r) => (
                <li key={r.student.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.has(r.student.id)} onChange={() => toggle(r.student.id)} />
                  <span className="text-gray-800">
                    {r.student.fullName} ({r.student.cohortYear})
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={apply}
            disabled={applying || (preview.length > 0 && selected.size === 0)}
            className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {applying
              ? he.curriculumCorrections.applying
              : preview.length === 0
                ? he.curriculumCorrections.saveRuleOnly
                : he.curriculumCorrections.applyButton.replace("{count}", String(selected.size))}
          </button>
        </div>
      )}
    </section>
  );
}

export default function CurriculumCorrectionsPage() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const isAdmin = profile?.role === UserRole.ADMIN;

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = subscribeStudents(Faculty.DATA_SCIENCE, setStudents);
    return unsubscribe;
  }, [isAdmin]);

  if (!profile) {
    return <p className="text-gray-500">{he.common.loading}</p>;
  }
  if (!isAdmin) {
    return <p className="text-red-600">{he.curriculumCorrections.accessDenied}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{he.curriculumCorrections.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{he.curriculumCorrections.description}</p>
      </div>

      <ExemptCourseSection students={students} />
      <CourseCreditsSection students={students} />
      <RestoreCourseSection students={students} />
      <MoveCourseCategorySection students={students} />
    </div>
  );
}
