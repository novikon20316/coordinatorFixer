"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  CURRENT_HEBREW_YEAR,
  he,
  HEBREW_YEAR_VALUES,
  HebrewYear,
  StudentImportRow,
  StudentImportSummary,
} from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";

function formatSummary(summary: StudentImportSummary): string {
  return he.studentImport.resultSummary
    .replace("{created}", String(summary.created))
    .replace("{total}", String(summary.totalRows))
    .replace("{skipped}", String(summary.skipped))
    .replace("{failed}", String(summary.failed));
}

export function StudentsImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<StudentImportSummary | null>(null);
  const [asOfYear, setAsOfYear] = useState<HebrewYear>(CURRENT_HEBREW_YEAR);

  async function handleFile(file: File) {
    setError(null);
    setSummary(null);
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      const rows = sheet ? XLSX.utils.sheet_to_json<StudentImportRow>(sheet, { defval: "" }) : [];

      if (rows.length === 0) {
        setError(he.studentImport.noRows);
        return;
      }

      const result = (await apiFetch("/api/students/import", {
        method: "POST",
        body: JSON.stringify({ rows, asOfYear }),
      })) as StudentImportSummary;
      setSummary(result);
      if (result.created > 0) onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">{he.studentImport.title}</h2>
        <p className="text-sm text-gray-600">{he.studentImport.description}</p>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          {he.studentImport.asOfYearLabel}
          <select
            value={asOfYear}
            onChange={(e) => setAsOfYear(e.target.value as HebrewYear)}
            className="w-fit rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {HEBREW_YEAR_VALUES.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="w-fit cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {uploading ? he.studentImport.uploading : he.studentImport.uploadButton}
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {summary && (
          <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">{formatSummary(summary)}</p>
            {summary.details.some((d) => d.status !== "created") && (
              <ul className="max-h-48 list-disc overflow-y-auto pr-4 text-xs text-gray-600">
                {summary.details
                  .filter((d) => d.status !== "created")
                  .map((d) => (
                    <li key={d.row}>
                      {he.table.columns.fullName} #{d.row} ({d.fullName || "—"}): {d.reason}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {he.studentDetail.close}
          </button>
        </div>
      </div>
    </div>
  );
}
