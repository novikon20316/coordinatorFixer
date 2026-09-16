"use client";

import { useState } from "react";
import { buildDefaultCourseCategories, he, Student } from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";
import { extractPdfPages } from "../lib/import/pdfText";
import { matchExisting } from "../lib/import/matchExisting";
import {
  AcademicBalanceImportPreview,
  applyAcademicBalanceToCategories,
  buildAcademicBalancePreview,
  parseAcademicBalancePages,
} from "../lib/import/parseAcademicBalance";

/** Uploads one student's official "מאזן חובות אקדמיים" PDF and previews the
 *  courseCategories changes it implies (see parseAcademicBalance.ts) before
 *  saving - matches the student by the ת.ז printed in the PDF itself, so
 *  unlike the spreadsheet imports this never creates a new student. */
export function AcademicBalanceImportModal({
  students,
  onClose,
  onDone,
}: {
  students: Student[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [matched, setMatched] = useState<Student | null>(null);
  const [preview, setPreview] = useState<AcademicBalanceImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setMatched(null);
    setPreview(null);
    setDone(false);
    setParsing(true);
    try {
      const pages = await extractPdfPages(file);
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
        body: JSON.stringify({ courseCategories: next }),
      });
      setDone(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSaving(false);
    }
  }

  const totalChanges = preview
    ? preview.newCoreEntries.length +
      preview.newElectiveEntries.length +
      preview.coreCreditFills.length +
      preview.electiveCreditFills.length +
      preview.mandatoryUpdates.length
    : 0;

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
              disabled={parsing}
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
              {he.academicBalanceImport.mandatoryCount.replace("{count}", String(preview.mandatoryUpdates.length))}
            </p>
            {totalChanges === 0 && <p className="text-xs text-amber-700">{he.academicBalanceImport.noChanges}</p>}
          </div>
        )}

        {done && (
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
        </div>
      </div>
    </div>
  );
}
