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
 *
 * Two more values are read off the report but don't belong to any course
 * category - they map onto Student's own top-level fields instead (see
 * buildAcademicBalancePreview):
 * - "פרויקט גמר" ("פרוייקט גמר" in the report's own spelling): a domain-like
 *   banner section of its own, holding exactly one course row - the
 *   student's actual project/thesis. Its ציון is Student.finalGrade.
 * - "סיכום כללי": the report's closing line, whose ציון is the student's
 *   overall average across the whole degree - Student.gpa (see its doc
 *   comment and the studentCard.degreeGpaHint copy - this is meant to be
 *   re-synced on every import, unlike finalGrade/course grades).
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
  /** ציון from the "פרויקט גמר" section's single course row - see the module
   *  comment. Undefined when the report has no graded project/thesis yet. */
  projectGrade?: number;
  /** ציון from the report's closing "סיכום כללי" line - see the module
   *  comment. Undefined only if that line wasn't found (unexpected report
   *  layout), not merely because it's 0. */
  overallAverage?: number;
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

// The report spells this "פרוייקט גמר" (double י) in practice, but matched
// loosely here in case that varies across exports. Its own banner (like
// KNOWN_DOMAINS) precedes a single course row - the student's actual
// project/thesis, whose ציון is the "פרויקט גמר" grade (see module comment).
const PROJECT_BANNER_PATTERN = /^פרוי+קט גמר$/;
const PROJECT_DOMAIN = "פרויקט גמר";

// The report's final row, after every domain's own subtotal - ties together
// into one line ("y" grouping merges it with the two rows just above it,
// since all three sit within groupIntoRows's 4.5pt tolerance) so it never has
// a course code and is otherwise indistinguishable from a discarded subtotal
// row. Its ציון is the student's overall/degree average (see module comment).
const GENERAL_SUMMARY_LABEL = "סיכום כללי";

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
  if (PROJECT_BANNER_PATTERN.test(trimmed)) return PROJECT_DOMAIN;
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
  let projectGrade: number | undefined;
  let overallAverage: number | undefined;

  if (headerY === undefined) return { core, elective, mandatory, endDomain: currentDomain, projectGrade, overallAverage };

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

    // The report's final line - see GENERAL_SUMMARY_LABEL - merges with the
    // two subtotal rows just above it and so never has a course code; caught
    // here before the codeItem check below would otherwise discard it as an
    // ordinary subtotal row.
    if (row.items.some((i) => i.text.trim() === GENERAL_SUMMARY_LABEL)) {
      const gradeItem = row.items.find((i) => NUMBER_PATTERN.test(i.text.trim()) && inBand(i.x, GRADE_X));
      if (gradeItem) overallAverage = Number(gradeItem.text.trim());
      lastRow = undefined;
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
    else if (currentDomain === PROJECT_DOMAIN && grade !== undefined) projectGrade = grade;
  }

  return { core, elective, mandatory, endDomain: currentDomain, projectGrade, overallAverage };
}

// A student's own contact-info header page - printed once per student ahead
// of their balance table(s) in both the per-student export and a combined
// batch export covering a whole cohort. Detecting it is what lets a batch
// file be split back into per-student page groups (see
// splitAcademicBalanceBatch) without depending on the ת.זהות value itself,
// which a balance page (not just a cover page) also carries.
function isCoverPage(page: PdfPage): boolean {
  const texts = new Set(page.items.map((i) => i.text.trim()));
  return texts.has("כתובת") && texts.has("טלפונים");
}

/**
 * Splits a combined "מאזן חובות אקדמיים" export - HIT's own batch download
 * for a whole cohort, all students concatenated into one PDF - back into
 * one page group per student, each importable exactly like a per-student
 * export (see parseAcademicBalancePages). A new group starts at every cover
 * page (see isCoverPage); a trailing report-footer page with no course data
 * of its own (e.g. the batch's closing "התלמידים שנבחרו" criteria page)
 * simply rides along on whichever student's group precedes it, contributing
 * nothing once parsed.
 *
 * A single-student export - no cover page, or exactly one - comes back as
 * one group holding every page, same as passing the whole file straight to
 * parseAcademicBalancePages used to; callers only need to branch into batch
 * handling once this returns more than one group.
 */
export function splitAcademicBalanceBatch(pages: PdfPage[]): PdfPage[][] {
  const groups: PdfPage[][] = [];
  let current: PdfPage[] = [];
  for (const page of pages) {
    if (isCoverPage(page) && current.length > 0) {
      groups.push(current);
      current = [page];
    } else {
      current.push(page);
    }
  }
  if (current.length > 0) groups.push(current);
  return groups.length > 0 ? groups : [pages];
}

export function parseAcademicBalancePages(pages: PdfPage[]): AcademicBalanceResult {
  const allRows = pages.flatMap((p) => groupIntoRows(p.items));
  const idNumber = extractLabeledValue(allRows, "ת.זהות");
  const fullName = extractLabeledValue(allRows, "שם");

  let currentDomain: string | undefined;
  const coreRows: ParsedCourseRow[] = [];
  const electiveRows: ParsedCourseRow[] = [];
  const mandatoryRows: ParsedCourseRow[] = [];
  let projectGrade: number | undefined;
  let overallAverage: number | undefined;
  for (const page of pages) {
    const result = parsePage(page.items, currentDomain);
    coreRows.push(...result.core);
    electiveRows.push(...result.elective);
    mandatoryRows.push(...result.mandatory);
    currentDomain = result.endDomain;
    if (result.projectGrade !== undefined) projectGrade = result.projectGrade;
    if (result.overallAverage !== undefined) overallAverage = result.overallAverage;
  }

  return { idNumber, fullName, coreRows, electiveRows, mandatoryRows, projectGrade, overallAverage };
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
  /** Student.finalGrade, filled from the "פרויקט גמר" section - only when the
   *  student has none recorded yet, matching how every other course grade in
   *  this preview is handled (never overwrites a grade already entered by
   *  hand - see the module comment above). */
  finalGradeFill?: number;
  /** Student.gpa, from the report's closing "סיכום כללי" line - unlike
   *  finalGrade this is re-synced on every import whenever it differs from
   *  what's stored, since it's the student's live, still-changing degree
   *  average rather than a one-time final grade (see studentCard.degreeGpaHint
   *  and the module comment above). */
  gpaFill?: number;
  /** Student.idNumber, from the report's own ת.זהות - only when the student
   *  has none on file yet (unlike gpa, never overwrites one already stored,
   *  since a mismatch there more likely means this was matched by name onto
   *  the wrong person than that the report is more current). A student
   *  matched by name alone - e.g. added by hand with no ת.ז, or imported
   *  from a source with no ID column - would otherwise stay without one
   *  forever, since matching only ever reads this value, never writes it. */
  idNumberFill?: string;
}

function toEntry(row: ParsedCourseRow): CourseCompletionEntry {
  return { name: row.name, credits: row.credits, grade: row.grade, passed: row.grade !== undefined };
}

/** Like toEntry, but sources נ"ז from נדרש - see the module comment on why
 *  מקצועות חובה rows use that column instead of נלמד/נרשם. */
function toMandatoryEntry(row: ParsedCourseRow): CourseCompletionEntry {
  return { name: row.name, credits: row.required, grade: row.grade, passed: row.grade !== undefined };
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

  const coreSplit = splitNewAndCreditFills(coreCategory?.entries ?? [], result.coreRows);
  const electiveSplit = splitNewAndCreditFills(electiveCategory?.entries ?? [], result.electiveRows);

  const mandatoryUpdates: { originalName: string; name: string; grade?: number; credits?: number }[] = [];
  const newMandatoryEntries: CourseCompletionEntry[] = [];
  if (mandatoryCategory) {
    const existingNames = new Set(mandatoryCategory.entries.map((e) => e.name.trim()));
    const seenNew = new Set<string>();
    for (const row of result.mandatoryRows) {
      const canonicalName = canonicalCoreCourseName(row.name.trim());
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
      const gradeFill = entry.grade === undefined ? row.grade : undefined;
      // נדרש, not נלמד - a course's standard נ"ז weight, present whether or
      // not the student has taken it, and correct even when נלמד exceeds it
      // (see the module comment on the "!" over-credit case). Synced on
      // every import (not just when missing) so a re-import can correct it.
      const creditsFill = row.required !== undefined && row.required !== entry.credits ? row.required : undefined;
      if (gradeFill !== undefined || creditsFill !== undefined || entry.name !== canonicalName) {
        mandatoryUpdates.push({ originalName: entry.name, name: canonicalName, grade: gradeFill, credits: creditsFill });
      }
    }
  }

  const finalGradeFill =
    result.projectGrade !== undefined && student.finalGrade === undefined ? result.projectGrade : undefined;
  const gpaFill =
    result.overallAverage !== undefined && result.overallAverage !== student.gpa ? result.overallAverage : undefined;
  const idNumberFill = result.idNumber && !student.idNumber ? result.idNumber : undefined;

  return {
    idNumber: result.idNumber,
    fullName: result.fullName,
    newCoreEntries: coreSplit.newEntries,
    newElectiveEntries: electiveSplit.newEntries,
    newMandatoryEntries,
    coreCreditFills: coreSplit.creditFills,
    electiveCreditFills: electiveSplit.creditFills,
    mandatoryUpdates,
    finalGradeFill,
    gpaFill,
    idNumberFill,
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

/** Total number of individual changes a preview would apply - shared between
 *  the single-student and batch import UIs (see AcademicBalanceImportModal)
 *  so a student with nothing new to import (already up to date) can be told
 *  apart from one actually worth confirming. */
export function countAcademicBalanceChanges(preview: AcademicBalanceImportPreview): number {
  return (
    preview.newCoreEntries.length +
    preview.newElectiveEntries.length +
    preview.coreCreditFills.length +
    preview.electiveCreditFills.length +
    preview.mandatoryUpdates.length +
    preview.newMandatoryEntries.length +
    (preview.finalGradeFill !== undefined ? 1 : 0) +
    (preview.gpaFill !== undefined ? 1 : 0) +
    (preview.idNumberFill !== undefined ? 1 : 0)
  );
}
