import { Request, Response, NextFunction } from "express";
import {
  Faculty,
  StudentTrack,
  StudentStatus,
  DegreeType,
  StudentImportRow,
  StudentImportRowResult,
  StudentImportSummary,
  mapStudentImportRow,
  HEBREW_YEAR_VALUES,
  HebrewYear,
} from "@admin-coordinator/shared";
import * as studentsService from "../services/students.service";

// Mirrors userImportExport.ts's MAX_IMPORT_ROWS on the sibling system - this
// admin utility only ever handles a college department's roster, not an
// unbounded upload.
const MAX_IMPORT_ROWS = 5000;

export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const { faculty, track, status, degreeType, previousCollege, degreeField, minGpa, maxGpa } = req.query;
    const students = await studentsService.listStudents({
      faculty: faculty as Faculty | undefined,
      track: track as StudentTrack | undefined,
      status: status as StudentStatus | undefined,
      degreeType: degreeType as DegreeType | undefined,
      previousCollege: previousCollege as string | undefined,
      degreeField: degreeField as string | undefined,
      minGpa: minGpa ? Number(minGpa) : undefined,
      maxGpa: maxGpa ? Number(maxGpa) : undefined,
    });
    res.json(students);
  } catch (err) {
    next(err);
  }
}

export async function getStudentById(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentsService.getStudent(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    next(err);
  }
}

export async function postStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentsService.createStudent(req.body);
    res.status(201).json(student);
  } catch (err) {
    next(err);
  }
}

export async function patchStudent(req: Request, res: Response, next: NextFunction) {
  try {
    await studentsService.updateStudent(req.params.id, req.body);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function removeStudent(req: Request, res: Response, next: NextFunction) {
  try {
    await studentsService.deleteStudent(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Bulk-creates candidate records from rows exported out of
 * organization-all-system (see shared/src/types/import.ts for why this is a
 * file upload rather than a live API call). Body: { rows: StudentImportRow[] }
 * - the client parses the uploaded .xlsx into that row shape client-side.
 */
export async function importStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = req.body?.rows;
    const asOfYear = req.body?.asOfYear as HebrewYear | undefined;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "Expected body.rows to be an array" });
    }
    if (!asOfYear || !HEBREW_YEAR_VALUES.includes(asOfYear)) {
      return res.status(400).json({ error: "Expected body.asOfYear to be a known Hebrew year" });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({ error: `File has more than ${MAX_IMPORT_ROWS} rows - split it and import separately` });
    }

    const details: StudentImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // header occupies row 1 in the source workbook
      const raw = rows[i] as StudentImportRow;
      const fullName = String(raw?.FullNameHe ?? raw?.FullNameEn ?? "");

      const mapped = mapStudentImportRow(raw, asOfYear);
      if (!mapped.ok) {
        details.push({ row: rowNumber, fullName, status: "skipped", reason: mapped.reason });
        continue;
      }

      try {
        await studentsService.createStudent(mapped.input);
        details.push({ row: rowNumber, fullName, status: "created" });
      } catch (err: any) {
        details.push({ row: rowNumber, fullName, status: "failed", reason: err?.message ?? "Unknown error" });
      }
    }

    const summary: StudentImportSummary = {
      totalRows: rows.length,
      created: details.filter((d) => d.status === "created").length,
      skipped: details.filter((d) => d.status === "skipped").length,
      failed: details.filter((d) => d.status === "failed").length,
      details,
    };
    res.json(summary);
  } catch (err) {
    next(err);
  }
}
