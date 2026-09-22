"use client";

import { useState } from "react";
import { buildDefaultCourseCategories, he, Student } from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";
import { extractPdfPages, PdfPage } from "../lib/import/pdfText";
import { matchExisting } from "../lib/import/matchExisting";
import {
  AcademicBalanceImportPreview,
  applyAcademicBalanceToCategories,
  buildAcademicBalancePreview,
  countAcademicBalanceChanges,
  parseAcademicBalancePages,
  splitAcademicBalanceBatch,
} from "../lib/import/parseAcademicBalance";

type BatchEntryStatus = "matched" | "unmatched" | "no-id";
type BatchSaveStatus = "idle" | "saving" | "done" | "error";

interface BatchEntry {
  key: string;
  idNumber?: string;
  fullName?: string;
  student?: Student;
  preview?: AcademicBalanceImportPreview;
  totalChanges: number;
  status: BatchEntryStatus;
  saveStatus: BatchSaveStatus;
  saveError?: string;
}

function buildBatchEntry(pages: PdfPage[], index: number, students: Student[]): BatchEntry {
  const result = parseAcademicBalancePages(pages);
  if (!result.idNumber) {
    return { key: `no-id-${index}`, fullName: result.fullName, totalChanges: 0, status: "no-id", saveStatus: "idle" };
  }
  const matchedId = matchExisting({ idNumber: result.idNumber, fullName: result.fullName ?? "" }, students);
  const student = matchedId ? students.find((s) => s.id === matchedId) : undefined;
  if (!student) {
    return {
      key: result.idNumber,
      idNumber: result.idNumber,
      fullName: result.fullName,
      totalChanges: 0,
      status: "unmatched",
      saveStatus: "idle",
    };
  }
  const preview = buildAcademicBalancePreview(result, student);
  return {
    key: student.id,
    idNumber: result.idNumber,
    fullName: student.fullName,
    student,
    preview,
    totalChanges: countAcademicBalanceChanges(preview),
    status: "matched",
    saveStatus: "idle",
  };
}

/** Uploads either one student's official "מאזן חובות אקדמיים" PDF, or HIT's
 *  combined batch export covering a whole cohort (all students concatenated
 *  into one PDF - see splitAcademicBalanceBatch), and previews the
 *  courseCategories changes it implies (see parseAcademicBalance.ts) before
 *  saving. Matches each student by the ת.ז printed in the PDF itself, so
 *  unlike the spreadsheet imports this never creates a new student. */
export function AcademicBalanceImportModal({
  students,
  onClose,
  onDone,
}: {
  students: Student[];
  onClose: () => void;
  /** Called with each imported student's id once its PATCH succeeds, so the
   *  caller can force just that student's already-open card to remount and
   *  pick up the fresh courseCategories - see StudentCard's own doc comment
   *  on why it otherwise never re-syncs from an external write. */
  onDone: (studentId: string) => void;
}) {
  const [matched, setMatched] = useState<Student | null>(null);
  const [preview, setPreview] = useState<AcademicBalanceImportPreview | null>(null);
  const [batchEntries, setBatchEntries] = useState<BatchEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setMatched(null);
    setPreview(null);
    setBatchEntries(null);
    setDone(false);
    setParsing(true);
    try {
      const pages = await extractPdfPages(file);
      const groups = splitAcademicBalanceBatch(pages);
      if (groups.length > 1) {
        setBatchEntries(groups.map((group, i) => buildBatchEntry(group, i, students)));
        return;
      }
      const result = parseAcademicBalancePages(pages);
      if (!result.idNumber) {
        setError(he.academicBalanceImport.noIdFound);
        return;
      }
      const matchedId = matchExisting({ idNumber: result.idNumber, fullName: result.fullName ?? "" }, students);
      const student = matchedId ? students.find((s) => s.id === matchedId) : undefined;
      if (!student) {
        setError(he.academicBalanceImport.studentNotFound.replace("{idNumber}", result.idNumber));
        return;
      }
      setMatched(student);
      setPreview(buildAcademicBalancePreview(result, student));
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!matched || !preview) return;
    setSaving(true);
    setError(null);
    try {
      const categories = matched.courseCategories ?? buildDefaultCourseCategories(matched.faculty);
      const next = applyAcademicBalanceToCategories(categories, preview);
      await apiFetch(`/api/students/${matched.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          courseCategories: next,
          ...(preview.finalGradeFill !== undefined ? { finalGrade: preview.finalGradeFill } : {}),
          ...(preview.gpaFill !== undefined ? { gpa: preview.gpaFill } : {}),
        }),
      });
      setDone(true);
      onDone(matched.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmBatch() {
    if (!batchEntries) return;
    setSaving(true);
    setError(null);
    const importable = batchEntries.filter((e) => e.status === "matched" && e.preview && e.totalChanges > 0);
    for (const entry of importable) {
      setBatchEntries((prev) => prev && prev.map((e) => (e.key === entry.key ? { ...e, saveStatus: "saving" } : e)));
      try {
        const student = entry.student!;
        const categories = student.courseCategories ?? buildDefaultCourseCategories(student.faculty);
        const next = applyAcademicBalanceToCategories(categories, entry.preview!);
        await apiFetch(`/api/students/${student.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            courseCategories: next,
            ...(entry.preview!.finalGradeFill !== undefined ? { finalGrade: entry.preview!.finalGradeFill } : {}),
            ...(entry.preview!.gpaFill !== undefined ? { gpa: entry.preview!.gpaFill } : {}),
          }),
        });
        onDone(student.id);
        setBatchEntries((prev) => prev && prev.map((e) => (e.key === entry.key ? { ...e, saveStatus: "done" } : e)));
      } catch (err) {
        const saveError = err instanceof Error ? err.message : he.common.error;
        setBatchEntries((prev) => prev && prev.map((e) => (e.key === entry.key ? { ...e, saveStatus: "error", saveError } : e)));
      }
    }
    setSaving(false);
    setDone(true);
  }

  const totalChanges = preview ? countAcademicBalanceChanges(preview) : 0;
  const batchImportable = batchEntries?.filter((e) => e.status === "matched" && e.totalChanges > 0) ?? [];
  const batchUnmatched = batchEntries?.filter((e) => e.status === "unmatched" || e.status === "no-id") ?? [];
  const batchImportedCount = batchEntries?.filter((e) => e.saveStatus === "done").length ?? 0;
  const batchFailedCount = batchEntries?.filter((e) => e.saveStatus === "error").length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">{he.academicBalanceImport.title}</h2>
        <p className="text-xs text-gray-500">{he.academicBalanceImport.description}</p>

        {!done && (
          <label className="w-fit cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {parsing ? he.common.loading : he.academicBalanceImport.uploadButton}
            <input
              type="file"
              accept="application/pdf"
              disabled={parsing || saving}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {matched && preview && !done && (
          <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 text-sm">
            <p className="font-semibold text-gray-900">{matched.fullName}</p>
            <p className="text-xs text-gray-600">
              {he.academicBalanceImport.coreCount.replace("{count}", String(preview.newCoreEntries.length))}
            </p>
            <p className="text-xs text-gray-600">
              {he.academicBalanceImport.electiveCount.replace("{count}", String(preview.newElectiveEntries.length))}
            </p>
            <p className="text-xs text-gray-600">
              {he.academicBalanceImport.creditFillCount.replace(
                "{count}",
                String(preview.coreCreditFills.length + preview.electiveCreditFills.length)
              )}
            </p>
            <p className="text-xs text-gray-600">
              {he.academicBalanceImport.mandatoryCount.replace(
                "{count}",
                String(preview.mandatoryUpdates.length + preview.newMandatoryEntries.length)
              )}
            </p>
            {preview.finalGradeFill !== undefined && (
              <p className="text-xs text-gray-600">
                {he.academicBalanceImport.finalGradeFill.replace("{grade}", String(preview.finalGradeFill))}
              </p>
            )}
            {preview.gpaFill !== undefined && (
              <p className="text-xs text-gray-600">
                {he.academicBalanceImport.gpaFill.replace("{gpa}", String(preview.gpaFill))}
              </p>
            )}
            {totalChanges === 0 && <p className="text-xs text-amber-700">{he.academicBalanceImport.noChanges}</p>}
          </div>
        )}

        {batchEntries && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-700">
              {he.academicBalanceImport.batchDetected.replace("{count}", String(batchEntries.length))}
            </p>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-gray-200 p-2">
              {batchEntries.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs">
                  <span className="text-gray-800">{entry.fullName || entry.idNumber || he.academicBalanceImport.batchUnknownEntry}</span>
                  {entry.status === "no-id" && <span className="text-red-600">{he.academicBalanceImport.noIdFound}</span>}
                  {entry.status === "unmatched" && (
                    <span className="text-red-600">
                      {he.academicBalanceImport.studentNotFound.replace("{idNumber}", entry.idNumber ?? "")}
                    </span>
                  )}
                  {entry.status === "matched" && entry.saveStatus === "idle" && (
                    <span className={entry.totalChanges === 0 ? "text-gray-400" : "text-gray-600"}>
                      {entry.totalChanges === 0
                        ? he.academicBalanceImport.noChanges
                        : he.academicBalanceImport.batchChangeCount.replace("{count}", String(entry.totalChanges))}
                    </span>
                  )}
                  {entry.saveStatus === "saving" && <span className="text-blue-600">{he.importReview.confirming}</span>}
                  {entry.saveStatus === "done" && <span className="text-green-700">✓</span>}
                  {entry.saveStatus === "error" && (
                    <span className="text-red-600" title={entry.saveError}>
                      {he.common.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {!done && (
              <p className="text-xs text-gray-500">
                {he.academicBalanceImport.batchMatchedCount.replace("{count}", String(batchImportable.length))}
                {batchUnmatched.length > 0 &&
                  ` · ${he.academicBalanceImport.batchUnmatchedCount.replace("{count}", String(batchUnmatched.length))}`}
              </p>
            )}
            {done && (
              <p className="text-xs text-gray-500">
                {he.academicBalanceImport.batchImportedCount.replace("{count}", String(batchImportedCount))}
                {batchFailedCount > 0 &&
                  ` · ${he.academicBalanceImport.batchFailedCount.replace("{count}", String(batchFailedCount))}`}
              </p>
            )}
          </div>
        )}

        {done && !batchEntries && (
          <p className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">
            {he.academicBalanceImport.success}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {done ? he.studentDetail.close : he.importReview.cancel}
          </button>
          {matched && preview && !done && (
            <button
              onClick={handleConfirm}
              disabled={saving || totalChanges === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? he.importReview.confirming : he.importReview.confirm}
            </button>
          )}
          {batchEntries && !done && (
            <button
              onClick={handleConfirmBatch}
              disabled={saving || batchImportable.length === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? he.importReview.confirming : he.academicBalanceImport.batchImportAll}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
