import {
  CourseCompletionCategory,
  CourseCompletionEntry,
  DATA_SCIENCE_CORE_CURRICULUM_ALIASES,
  DATA_SCIENCE_CORE_CURRICULUM_COURSES,
  Student,
} from "@admin-coordinator/shared";
import { PdfPage, PdfTextItem } from "./pdfText";

/**
 * Parses HIT's "מאזן חובות אקדמיים" per-student PDF export into course rows
 * grouped by domain (ליבה / קורסי בחירה / מדעי הנתונים).
 *
 * The report has no text-layer table structure - rows are reconstructed from
 * each text run's (x, y) position, calibrated against a real export (see the
 * x-bands below). Two rules drive what counts as a real course:
 * - "תחום משני" values like "ליבה 1"/"ליבה 2" are slot labels, not course
 *   names - the real course name is the row(s) nested under that slot,
 *   found under "שם שעור".
 * - A course with a grade (ציון) has its נ"ז under נלמד; one the student is
 *   enrolled in but not yet graded has its נ"ז under נרשם instead. A slot
 *   with no course at all (only נותר filled, or no rows under it) is simply
 *   skipped - it's an unmet requirement, not a course.
 */

interface ParsedCourseRow {
  name: string;
  credits?: number;
  grade?: number;
}

export interface AcademicBalanceResult {
  idNumber?: string;
  fullName?: string;
  coreRows: ParsedCourseRow[];
  electiveRows: ParsedCourseRow[];
  /** Rows under "מדעי הנתונים" - matched against the fixed core-curriculum
   *  catalog by the caller (buildAcademicBalancePreview), since only some of
   *  these rows (e.g. not "סמינר מחקר") belong to that catalog. */
  mandatoryRows: ParsedCourseRow[];
}

// Requires a dash - a real course code always has one (e.g. "003-99225",
// "000-0051095-31"), which is what keeps this from also matching a plain
// number like a grade ("98") or subtotal value ("6.00").
const CODE_PATTERN = /^\d+-\d[\d-]*(\s+תשפ\S*)?$/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const KNOWN_DOMAINS = ["ליבה", "קורסי בחירה", "מדעי הנתונים"];

// x-bands calibrated against a real מאזן חובות אקדמיים export - the
// report's generator uses fixed coordinates regardless of student. Small
// dead zones are left between bands (e.g. 104-108, 124-152) so a value
// rendered a few points off its header still lands unambiguously.
const LEARNED_CREDITS_X = [152, 172] as const; // נלמד - a graded course's נ"ז
const ENROLLED_CREDITS_X = [108, 124] as const; // נרשם - an ungraded, in-progress course's נ"ז
const GRADE_X = [85, 104] as const; // ציון
const BANNER_MIN_X = 500; // domain/sub-domain banner rows sit far to the right
const COURSE_NAME_MAX_X = 400; // a wrapped course name's continuation line

interface PdfRow {
  y: number;
  items: PdfTextItem[];
}

function inBand(x: number, [min, max]: readonly [number, number]): boolean {
  return x >= min && x <= max;
}

/** Groups text items into visual rows by y-position - compares against the
 *  first item in each row (not a running average) since a row's own items
 *  can drift a few points from each other (e.g. the course code renders
 *  ~3pt lower than the rest of its row in this report). */
function groupIntoRows(items: PdfTextItem[]): PdfRow[] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows: PdfRow[] = [];
  for (const item of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(item.y - last.items[0].y) <= 4.5) last.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  for (const row of rows) row.items.sort((a, b) => b.x - a.x); // RTL: descending x = reading order
  return rows;
}

function findHeaderY(rows: PdfRow[]): number | undefined {
  const row = rows.find(
    (r) => r.items.some((i) => i.text.trim() === "שם שעור") && r.items.some((i) => i.text.trim() === "קוד שעור")
  );
  return row?.y;
}

/** A banner row's text is either a real domain ("ליבה", "קורסי בחירה", ...)
 *  or a sub-domain slot label ("ליבה 1") of whatever domain is already
 *  current - the latter is informational only and never changes the
 *  current domain. */
function classifyBanner(text: string, currentDomain: string | undefined): string {
  const trimmed = text.trim();
  if (KNOWN_DOMAINS.includes(trimmed)) return trimmed;
  if (currentDomain && trimmed.startsWith(`${currentDomain} `)) return currentDomain;
  return "OTHER";
}

function extractLabeledValue(rows: PdfRow[], label: string): string | undefined {
  for (const row of rows) {
    const idx = row.items.findIndex((i) => i.text.trim() === label);
    if (idx !== -1 && row.items[idx + 1]) return row.items[idx + 1].text.trim();
  }
  return undefined;
}

function parsePage(items: PdfTextItem[], startDomain: string | undefined) {
  const rows = groupIntoRows(items);
  const headerY = findHeaderY(rows);
  const core: ParsedCourseRow[] = [];
  const elective: ParsedCourseRow[] = [];
  const mandatory: ParsedCourseRow[] = [];
  let currentDomain = startDomain;
  let lastRow: ParsedCourseRow | undefined;

  if (headerY === undefined) return { core, elective, mandatory, endDomain: currentDomain };

  // A small margin below the header row's own y also skips the "משני" line
  // of the wrapped "תחום משני" header label, which sits just under it.
  const dataRows = rows.filter((r) => r.y < headerY - 6).sort((a, b) => b.y - a.y);

  for (const row of dataRows) {
    if (row.items.length === 1) {
      const item = row.items[0];
      const text = item.text.trim();
      if (item.x >= BANNER_MIN_X) {
        currentDomain = classifyBanner(text, currentDomain);
        lastRow = undefined;
        continue;
      }
      if (lastRow && item.x <= COURSE_NAME_MAX_X && !NUMBER_PATTERN.test(text) && !text.startsWith('סה"כ')) {
        lastRow.name = `${lastRow.name} ${text}`.trim();
      }
      continue;
    }

    const codeItem = row.items.find((i) => CODE_PATTERN.test(i.text.trim()));
    if (!codeItem) {
      lastRow = undefined; // a סה"כ subtotal row or similar aggregate, not a course
      continue;
    }

    const nameItem = row.items.find(
      (i) => i !== codeItem && /[א-ת]/.test(i.text) && i.text.trim().length > 1 && !CODE_PATTERN.test(i.text.trim())
    );
    if (!nameItem) {
      lastRow = undefined;
      continue;
    }

    let credits: number | undefined;
    let grade: number | undefined;
    for (const i of row.items) {
      const t = i.text.trim();
      if (!NUMBER_PATTERN.test(t)) continue;
      const n = Number(t);
      if (inBand(i.x, LEARNED_CREDITS_X)) credits = n;
      else if (credits === undefined && inBand(i.x, ENROLLED_CREDITS_X)) credits = n;
      else if (inBand(i.x, GRADE_X)) grade = n;
    }

    const parsedRow: ParsedCourseRow = { name: nameItem.text.trim(), credits, grade };
    lastRow = parsedRow;

    if (currentDomain === "ליבה") core.push(parsedRow);
    else if (currentDomain === "קורסי בחירה") elective.push(parsedRow);
    else if (currentDomain === "מדעי הנתונים") mandatory.push(parsedRow);
  }

  return { core, elective, mandatory, endDomain: currentDomain };
}

export function parseAcademicBalancePages(pages: PdfPage[]): AcademicBalanceResult {
  const allRows = pages.flatMap((p) => groupIntoRows(p.items));
  const idNumber = extractLabeledValue(allRows, "ת.זהות");
  const fullName = extractLabeledValue(allRows, "שם");

  let currentDomain: string | undefined;
  const coreRows: ParsedCourseRow[] = [];
  const electiveRows: ParsedCourseRow[] = [];
  const mandatoryRows: ParsedCourseRow[] = [];
  for (const page of pages) {
    const result = parsePage(page.items, currentDomain);
    coreRows.push(...result.core);
    electiveRows.push(...result.elective);
    mandatoryRows.push(...result.mandatory);
    currentDomain = result.endDomain;
  }

  return { idNumber, fullName, coreRows, electiveRows, mandatoryRows };
}

export interface AcademicBalanceImportPreview {
  idNumber?: string;
  fullName?: string;
  newCoreEntries: CourseCompletionEntry[];
  newElectiveEntries: CourseCompletionEntry[];
  /** נ"ז fills for a core/elective entry that already exists (by name) but
   *  has no credits yet - e.g. a coordinator typed the course name by hand,
   *  or a semester-grade import filled its grade but that source has no נ"ז
   *  column at all (see SemesterCourseGrade in shared/src/types/student.ts). */
  coreCreditFills: { name: string; credits: number }[];
  electiveCreditFills: { name: string; credits: number }[];
  mandatoryUpdates: { name: string; grade?: number; credits?: number }[];
}

function toEntry(row: ParsedCourseRow): CourseCompletionEntry {
  return { name: row.name, credits: row.credits, grade: row.grade, passed: row.grade !== undefined };
}

/** Splits a domain's parsed rows into brand-new entries (no existing entry
 *  with that name) and נ"ז fills for entries that already exist but have no
 *  credits recorded yet - grade/passed on an existing entry is left exactly
 *  as the coordinator set it either way, only the missing נ"ז gets filled. */
function splitNewAndCreditFills(
  existing: CourseCompletionEntry[],
  rows: ParsedCourseRow[]
): { newEntries: CourseCompletionEntry[]; creditFills: { name: string; credits: number }[] } {
  const byName = new Map(existing.map((e) => [e.name.trim(), e]));
  const seen = new Set<string>();
  const newEntries: CourseCompletionEntry[] = [];
  const creditFills: { name: string; credits: number }[] = [];
  for (const row of rows) {
    const key = row.name.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const existingEntry = byName.get(key);
    if (existingEntry) {
      if (existingEntry.credits === undefined && row.credits !== undefined) {
        creditFills.push({ name: key, credits: row.credits });
      }
    } else {
      newEntries.push(toEntry(row));
    }
  }
  return { newEntries, creditFills };
}

function canonicalCoreCourseName(name: string): string {
  if (DATA_SCIENCE_CORE_CURRICULUM_COURSES.includes(name)) return name;
  const canonical = Object.keys(DATA_SCIENCE_CORE_CURRICULUM_ALIASES).find((c) =>
    DATA_SCIENCE_CORE_CURRICULUM_ALIASES[c].includes(name)
  );
  return canonical ?? name;
}

/** Builds a preview of what this PDF would change on `student` - shown to
 *  the coordinator before anything is saved (see AcademicBalanceImportModal).
 *  Grade and נ"ז are filled independently and never overwritten once set by
 *  hand - a core_curriculum entry whose grade already came from a semester-
 *  grade import (which never carries נ"ז at all) still gets its credits
 *  filled in here, even though its grade is left untouched. */
export function buildAcademicBalancePreview(
  result: AcademicBalanceResult,
  student: Student
): AcademicBalanceImportPreview {
  const categories = student.courseCategories ?? [];
  const coreCategory = categories.find((c) => c.key === "core");
  const electiveCategory = categories.find((c) => c.key === "elective");
  const mandatoryCategory = categories.find((c) => c.key === "core_curriculum");

  const coreSplit = splitNewAndCreditFills(coreCategory?.entries ?? [], result.coreRows);
  const electiveSplit = splitNewAndCreditFills(electiveCategory?.entries ?? [], result.electiveRows);

  const mandatoryUpdates: { name: string; grade?: number; credits?: number }[] = [];
  if (mandatoryCategory) {
    for (const row of result.mandatoryRows) {
      const canonicalName = canonicalCoreCourseName(row.name.trim());
      const entry = mandatoryCategory.entries.find((e) => e.name === canonicalName);
      if (!entry) continue;
      const gradeFill = entry.grade === undefined ? row.grade : undefined;
      const creditsFill = entry.credits === undefined ? row.credits : undefined;
      if (gradeFill !== undefined || creditsFill !== undefined) {
        mandatoryUpdates.push({ name: canonicalName, grade: gradeFill, credits: creditsFill });
      }
    }
  }

  return {
    idNumber: result.idNumber,
    fullName: result.fullName,
    newCoreEntries: coreSplit.newEntries,
    newElectiveEntries: electiveSplit.newEntries,
    coreCreditFills: coreSplit.creditFills,
    electiveCreditFills: electiveSplit.creditFills,
    mandatoryUpdates,
  };
}

/** Applies a preview onto a student's courseCategories - pure, so the
 *  caller decides when/whether to actually save it (see
 *  AcademicBalanceImportModal.handleConfirm). */
export function applyAcademicBalanceToCategories(
  categories: CourseCompletionCategory[],
  preview: AcademicBalanceImportPreview
): CourseCompletionCategory[] {
  return categories.map((c) => {
    if (c.key === "core") {
      let entries = c.entries;
      if (preview.coreCreditFills.length > 0) {
        entries = entries.map((e) => {
          const fill = preview.coreCreditFills.find((f) => f.name === e.name.trim());
          return fill ? { ...e, credits: fill.credits } : e;
        });
      }
      if (preview.newCoreEntries.length > 0) entries = [...entries, ...preview.newCoreEntries];
      return entries === c.entries ? c : { ...c, entries };
    }
    if (c.key === "elective") {
      let entries = c.entries;
      if (preview.electiveCreditFills.length > 0) {
        entries = entries.map((e) => {
          const fill = preview.electiveCreditFills.find((f) => f.name === e.name.trim());
          return fill ? { ...e, credits: fill.credits } : e;
        });
      }
      if (preview.newElectiveEntries.length > 0) entries = [...entries, ...preview.newElectiveEntries];
      return entries === c.entries ? c : { ...c, entries };
    }
    if (c.key === "core_curriculum" && preview.mandatoryUpdates.length > 0) {
      return {
        ...c,
        entries: c.entries.map((e) => {
          const update = preview.mandatoryUpdates.find((u) => u.name === e.name);
          if (!update) return e;
          return {
            ...e,
            grade: update.grade ?? e.grade,
            credits: update.credits ?? e.credits,
            passed: update.grade !== undefined || e.passed,
          };
        }),
      };
    }
    return c;
  });
}
