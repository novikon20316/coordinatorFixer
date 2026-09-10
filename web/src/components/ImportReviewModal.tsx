"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { CURRENT_HEBREW_YEAR, HEBREW_YEAR_VALUES, HebrewYear, he } from "@admin-coordinator/shared";
import { ProposedChange } from "../lib/import/types";
import { SheetRows } from "../lib/import/headerMatch";

/**
 * Generic "parse -> review -> confirm" flow for the richer imports (see
 * shared/src/constants/hebrewYear.ts and the lib/import/parse* modules) -
 * unlike StudentsImportModal (which commits immediately on upload for the
 * simpler, single-shape organization-all-system export), these source files
 * are varied enough in layout that the coordinator needs to see and can
 * uncheck proposed rows before anything is saved.
 */
export function ImportReviewModal({
  title,
  yearLabel,
  parseSheet,
  onClose,
  onDone,
}: {
  title: string;
  yearLabel: string;
  parseSheet: (rows: SheetRows, year: HebrewYear) => ProposedChange[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [year, setYear] = useState<HebrewYear>(CURRENT_HEBREW_YEAR);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetRowsByName, setSheetRowsByName] = useState<Record<string, SheetRows>>({});
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [changes, setChanges] = useState<ProposedChange[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [doneCount, setDoneCount] = useState<number | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setChanges(null);
    setDoneCount(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const rowsByName: Record<string, SheetRows> = {};
      for (const name of workbook.SheetNames) {
        rowsByName[name] = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: "" });
      }
      setSheetRowsByName(rowsByName);
      setSheetNames(workbook.SheetNames);
      setSelectedSheet(workbook.SheetNames[0] ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    }
  }

  function handleParse() {
    setError(null);
    const rows = sheetRowsByName[selectedSheet];
    if (!rows) return;
    const result = parseSheet(rows, year);
    if (result.length === 0) {
      setError(he.studentImport.noRows);
      return;
    }
    setChanges(result);
    setChecked(new Set(result.map((c) => c.key)));
  }

  async function handleConfirm() {
    if (!changes) return;
    setConfirming(true);
    let count = 0;
    for (const change of changes) {
      if (!checked.has(change.key)) continue;
      try {
        await change.apply();
        count++;
      } catch {
        // Keep going - the summary below reflects how many actually succeeded.
      }
    }
    setDoneCount(count);
    setConfirming(false);
    onDone();
  }

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>

        {doneCount === null && (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                {yearLabel}
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value as HebrewYear)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {HEBREW_YEAR_VALUES.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label className="w-fit cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {he.studentImport.uploadButton}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                  }}
                />
              </label>

              {sheetNames.length > 0 && (
                <label className="flex flex-col gap-1 text-xs text-gray-600">
                  גיליון
                  <select
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    {sheetNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {sheetNames.length > 0 && (
                <button
                  onClick={handleParse}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  פענח קובץ
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {changes && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-700">
                  {he.importReview.rowsFound.replace("{count}", String(changes.length))}
                </p>
                <p className="text-xs text-gray-500">{he.importReview.description}</p>
                <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
                  {changes.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-sm last:border-b-0">
                      <input type="checkbox" checked={checked.has(c.key)} onChange={() => toggle(c.key)} />
                      <span className="flex-1 text-gray-800">{c.label}</span>
                      <span className="text-xs text-gray-500">{c.actionLabel}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {doneCount !== null && (
          <p className="rounded-md bg-gray-50 p-3 text-sm font-medium text-gray-900">
            {he.importReview.resultSummary.replace("{count}", String(doneCount))}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {doneCount !== null ? he.studentDetail.close : he.importReview.cancel}
          </button>
          {changes && doneCount === null && (
            <button
              onClick={handleConfirm}
              disabled={confirming || checked.size === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {confirming ? he.importReview.confirming : he.importReview.confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
