import {
  CourseCompletionCategory,
  CourseCompletionEntry,
  DATA_SCIENCE_CORE_CURRICULUM_ALIASES,
  DATA_SCIENCE_CORE_CURRICULUM_COURSES,
  GENERIC_ELECTIVE_SLOT_NAMES,
  Student,
} from "@admin-coordinator/shared";
import { PdfPage, PdfTextItem } from "./pdfText";

/**
 * Parses HIT's "מאזן חובות אקדמיים" per-student PDF export into course rows
 * grouped by domain (ליבה / קורסי בחירה / מדעי הנתונים).
 *
 * The report has no text-layer table structure - rows are reconstructed from
 * each text run's (x, y) position, calibrated against a real export (see the
 * x-bands below). A few rules drive what counts as a real course and what
 * נ"ז to import for it:
 * - "תחום משני" values like "ליבה 1"/"ליבה 2" are slot labels, not course
 *   names - the real course name is the row(s) nested under that slot,
 *   found under "שם שעור".
 * - Under "ליבה"/"קורסי בחירה": a course with a grade (ציון) has its נ"ז
 *   under נלמד; one the student is enrolled in but not yet graded has it
 *   under נרשם instead. A slot with no course at all (only נותר filled, or
 *   no rows under it) is simply skipped - it's an unmet requirement, not a
 *   course.
 * - Under "מדעי הנתונים" (the fixed core-curriculum catalog): every course
 *   in the catalog prints its own row whether taken or not, so unlike
 *   ליבה/בחירה there's no "row missing entirely" case to skip. The נ"ז to
 *   import is always נדרש (that course's standard credit weight) rather
 *   than נלמד - נלמד can exceed נדרש when a student took a heavier version
 *   of the course (flagged with "!" in the report, since the excess never
 *   counts toward the total), and נדרש is what's meaningful either way,
 *   whether or not the course has a grade yet.
 * - A catalog course can also show up under ליבה/קורסי בחירה instead of
 *   מדעי הנתונים - HIT credits it toward whichever requirement the student
 *   used it for, not necessarily the department's own מקצועות חובה bucket.
 *   Either way it counts toward that מקצועות חובה slot (see
 *   buildAcademicBalancePreview), since the coordinator wants to know "has
 *   this student passed X" regardless of which domain HIT counted it
 *   under - and only there, not also under ליבה/בחירה, so the same course
 *   doesn't visibly appear twice on the card (see coreRemovals/
 *   electiveRemovals).
 */

interface ParsedCourseRow {
  name: string;
  credits?: number;
  /** נדרש for this row - only meaningful for מדעי הנתונים rows, which use
   *  this (not `credits`) as the course's נ"ז - see buildAcademicBalancePreview. */
  required?: number;
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
// number like a grade ("98") or subtotal value ("6.00"). The trailing
// "תשפX" year (and, for some rows, a single semester letter sandwiched
// before it - e.g. "003-0099101-31 ב תשפה") is usually part of the same
// text run as the code, but pdf.js doesn't merge them consistently across
// every row of a real export, so both are optional here.
const CODE_PATTERN = /^\d+-\d[\d-]*(\s+[א-ת])?(\s+תשפ\S*)?$/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const KNOWN_DOMAINS = ["ליבה", "קורסי בחירה", "מדעי הנתונים"];

// x-bands calibrated against a real מאזן חובות אקדמיים export - the
// report's generator uses fixed coordinates regardless of student. Small
// dead zones are left between bands (e.g. 104-108, 124-152) so a value
// rendered a few points off its header still lands unambiguously.
const LEARNED_CREDITS_X = [152, 172] as const; // נלמד - a graded course's נ"ז
const ENROLLED_CREDITS_X = [108, 124] as const; // נרשם - an ungraded, in-progress course's נ"ז
const REQUIRED_X = [178, 194] as const; // נדרש - a course's own standard נ"ז weight
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
    if (!nameItem || GENERIC_ELECTIVE_SLOT_NAMES.has(nameItem.text.trim())) {
      lastRow = undefined;
      continue;
    }

    let credits: number | undefined;
    let required: number | undefined;
    let grade: number | undefined;
    for (const i of row.items) {
      const t = i.text.trim();
      if (!NUMBER_PATTERN.test(t)) continue;
      const n = Number(t);
      if (inBand(i.x, LEARNED_CREDITS_X)) credits = n;
      else if (credits === undefined && inBand(i.x, ENROLLED_CREDITS_X)) credits = n;
      else if (inBand(i.x, REQUIRED_X)) required = n;
      else if (inBand(i.x, GRADE_X)) grade = n;
    }

    const parsedRow: ParsedCourseRow = { name: nameItem.text.trim(), credits, required, grade };
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
  /** מקצועות חובה rows that don't match any of the fixed catalog's known
   *  courses (e.g. סמינר מחקר) - the department's own מקצועות חובה listing
   *  isn't necessarily limited to the 7 courses in DATA_SCIENCE_CORE_
   *  CURRICULUM_COURSES (see canonicalCoreCourseName), so these are added as
   *  extra entries on that category rather than silently dropped. */
  newMandatoryEntries: CourseCompletionEntry[];
  /** נ"ז syncs for a core/elective entry that already exists (by name) but
   *  whose credits don't match the PDF - e.g. a coordinator typed the course
   *  name by hand with no נ"ז, a semester-grade import filled its grade but
   *  that source has no נ"ז column at all (see SemesterCourseGrade in
   *  shared/src/types/student.ts), or an earlier import run recorded the
   *  wrong value. נ"ז is treated as authoritative from this official report,
   *  so re-importing the same PDF keeps correcting it rather than only
   *  filling it once - unlike grade/passed on an existing entry, which are
   *  always left exactly as the coordinator set them. */
  coreCreditFills: { name: string; credits: number }[];
  electiveCreditFills: { name: string; credits: number }[];
  /** `originalName` is the entry's current stored name (matched against to
   *  apply the update - see applyAcademicBalanceToCategories); `name` is
   *  its canonical form, applied as a rename when the two differ (e.g. an
   *  older curriculum's own English name, still stored as-is since renaming
   *  it was previously only ever a display-time computation - see
   *  syncCourseCategoriesFromHistory - never actually persisted). */
  mandatoryUpdates: { originalName: string; name: string; grade?: number; credits?: number }[];
  /** Names of existing core/elective entries to drop because this import
   *  recognized them as one of the 7 מקצועות חובה catalog courses (see
   *  mandatoryUpdates) - a course counts toward that requirement instead of
   *  also sitting under ליבה/בחירה, not in addition to it, so it shouldn't
   *  visibly appear twice on the card. */
  coreRemovals: string[];
  electiveRemovals: string[];
}

function toEntry(row: ParsedCourseRow): CourseCompletionEntry {
  return { name: row.name, credits: row.credits, grade: row.grade, passed: row.grade !== undefined };
}

/** Like toEntry, but prefers נדרש over נלמד/נרשם when both are present - see
 *  the module comment on why (a מדעי הנתונים row always has נדרש; a ליבה/
 *  בחירה row credited toward the catalog instead never does, so this falls
 *  back to its own credits column). */
function toMandatoryEntry(row: ParsedCourseRow): CourseCompletionEntry {
  return { name: row.name, credits: row.required ?? row.credits, grade: row.grade, passed: row.grade !== undefined };
}

/** Splits a domain's parsed rows into brand-new entries (no existing entry
 *  with that name) and נ"ז syncs for entries that already exist but whose
 *  credits don't match this PDF - see the coreCreditFills doc comment above
 *  for why נ"ז keeps syncing on every import instead of only filling once. */
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
      if (row.credits !== undefined && row.credits !== existingEntry.credits) {
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
 *  Grade and נ"ז are handled independently: a grade already entered by hand
 *  is never overwritten, but נ"ז is treated as authoritative from this
 *  official report and kept in sync on every import (a core_curriculum
 *  entry whose grade already came from a semester-grade import - which
 *  never carries נ"ז at all - still gets its credits filled in here, even
 *  though its grade is left untouched; re-importing the same PDF later also
 *  corrects a credits value an earlier import got wrong). */
export function buildAcademicBalancePreview(
  result: AcademicBalanceResult,
  student: Student
): AcademicBalanceImportPreview {
  const categories = student.courseCategories ?? [];
  const coreCategory = categories.find((c) => c.key === "core");
  const electiveCategory = categories.find((c) => c.key === "elective");
  const mandatoryCategory = categories.find((c) => c.key === "core_curriculum");

  // A department catalog course can be credited toward ליבה/קורסי בחירה
  // instead of מדעי הנתונים for a given student (HIT's own report puts it
  // under whichever domain counted it) - still worth marking the מקצועות
  // חובה slot fulfilled for the coordinator's own tracking of "has this
  // student passed X". It counts toward that requirement instead of also
  // sitting under ליבה/בחירה (see coreRemovals/electiveRemovals below), not
  // in addition to it, so it's excluded from the normal ליבה/בחירה
  // processing here.
  const isCatalogCourse = (row: ParsedCourseRow) =>
    DATA_SCIENCE_CORE_CURRICULUM_COURSES.includes(canonicalCoreCourseName(row.name.trim()));
  const catalogRowsFromCore = result.coreRows.filter(isCatalogCourse);
  const catalogRowsFromElective = result.electiveRows.filter(isCatalogCourse);
  const nonCatalogCoreRows = result.coreRows.filter((row) => !isCatalogCourse(row));
  const nonCatalogElectiveRows = result.electiveRows.filter((row) => !isCatalogCourse(row));

  const coreSplit = splitNewAndCreditFills(coreCategory?.entries ?? [], nonCatalogCoreRows);
  const electiveSplit = splitNewAndCreditFills(electiveCategory?.entries ?? [], nonCatalogElectiveRows);
  const catalogNamesInCore = new Set(catalogRowsFromCore.map((r) => r.name.trim()));
  const catalogNamesInElective = new Set(catalogRowsFromElective.map((r) => r.name.trim()));
  const coreRemovals = (coreCategory?.entries ?? []).map((e) => e.name.trim()).filter((n) => catalogNamesInCore.has(n));
  const electiveRemovals = (electiveCategory?.entries ?? [])
    .map((e) => e.name.trim())
    .filter((n) => catalogNamesInElective.has(n));

  const mandatoryUpdates: { originalName: string; name: string; grade?: number; credits?: number }[] = [];
  const newMandatoryEntries: CourseCompletionEntry[] = [];
  if (mandatoryCategory) {
    const existingNames = new Set(mandatoryCategory.entries.map((e) => e.name.trim()));
    const seenNew = new Set<string>();
    const seenCanonical = new Set<string>();
    // Only rows that actually match a known catalog course make it into
    // this combined list - a non-catalog ליבה/בחירה course (e.g. "כריית
    // טקסטים") never reaches here, so it can't spawn a bogus מקצועות חובה
    // entry the way a genuine מדעי הנתונים extra (e.g. סמינריון)
    // legitimately can (see newMandatoryEntries below).
    for (const row of [...result.mandatoryRows, ...catalogRowsFromCore, ...catalogRowsFromElective]) {
      const canonicalName = canonicalCoreCourseName(row.name.trim());
      if (seenCanonical.has(canonicalName)) continue;
      // Canonicalize the STORED entry's name too, not just the PDF row's -
      // an older curriculum's own English name (or another alternate
      // spelling in DATA_SCIENCE_CORE_CURRICULUM_ALIASES) would otherwise
      // never match the PDF's current Hebrew name, duplicating the course
      // as a brand-new entry instead of updating the existing one.
      const entry = mandatoryCategory.entries.find((e) => canonicalCoreCourseName(e.name.trim()) === canonicalName);
      if (!entry) {
        // Not one of the known catalog courses (e.g. סמינר מחקר) - add it as
        // an extra entry instead of dropping it (see newMandatoryEntries).
        const key = row.name.trim();
        if (!key || existingNames.has(key) || seenNew.has(key)) continue;
        seenNew.add(key);
        newMandatoryEntries.push(toMandatoryEntry(row));
        continue;
      }
      seenCanonical.add(canonicalName);
      const gradeFill = entry.grade === undefined ? row.grade : undefined;
      // נדרש, not נלמד - a course's standard נ"ז weight, present whether or
      // not the student has taken it, and correct even when נלמד exceeds it
      // (see the module comment on the "!" over-credit case); falls back to
      // the row's own credits for a ליבה/בחירה row, which never has נדרש.
      // Synced on every import (not just when missing) so a re-import can
      // correct it.
      const rowCredits = row.required ?? row.credits;
      const creditsFill = rowCredits !== undefined && rowCredits !== entry.credits ? rowCredits : undefined;
      if (gradeFill !== undefined || creditsFill !== undefined || entry.name !== canonicalName) {
        mandatoryUpdates.push({ originalName: entry.name, name: canonicalName, grade: gradeFill, credits: creditsFill });
      }
    }
  }

  return {
    idNumber: result.idNumber,
    fullName: result.fullName,
    newCoreEntries: coreSplit.newEntries,
    newElectiveEntries: electiveSplit.newEntries,
    newMandatoryEntries,
    coreCreditFills: coreSplit.creditFills,
    electiveCreditFills: electiveSplit.creditFills,
    mandatoryUpdates,
    coreRemovals,
    electiveRemovals,
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
      if (preview.coreRemovals.length > 0) {
        entries = entries.filter((e) => !preview.coreRemovals.includes(e.name.trim()));
      }
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
      if (preview.electiveRemovals.length > 0) {
        entries = entries.filter((e) => !preview.electiveRemovals.includes(e.name.trim()));
      }
      if (preview.electiveCreditFills.length > 0) {
        entries = entries.map((e) => {
          const fill = preview.electiveCreditFills.find((f) => f.name === e.name.trim());
          return fill ? { ...e, credits: fill.credits } : e;
        });
      }
      if (preview.newElectiveEntries.length > 0) entries = [...entries, ...preview.newElectiveEntries];
      return entries === c.entries ? c : { ...c, entries };
    }
    if (c.key === "core_curriculum") {
      let entries = c.entries;
      if (preview.mandatoryUpdates.length > 0) {
        entries = entries.map((e) => {
          const update = preview.mandatoryUpdates.find((u) => u.originalName === e.name);
          if (!update) return e;
          return {
            ...e,
            name: update.name,
            grade: update.grade ?? e.grade,
            credits: update.credits ?? e.credits,
            passed: update.grade !== undefined || e.passed,
          };
        });
      }
      if (preview.newMandatoryEntries.length > 0) entries = [...entries, ...preview.newMandatoryEntries];
      return entries === c.entries ? c : { ...c, entries };
    }
    return c;
  });
}
