import {
  addHebrewYears,
  DegreeType,
  expectedGraduationYear,
  Faculty,
  GENERIC_ELECTIVE_SLOT_NAMES,
  HebrewYear,
  mergeAcademicHistory,
  NON_COURSE_COLUMN_NAMES,
  SemesterCourseGrade,
  SemesterRecord,
  Student,
  StudentStatus,
  StudentTrack,
} from "@admin-coordinator/shared";
import { apiFetch } from "../apiClient";
import {
  buildHeaderMap,
  findHeaderRowIndex,
  forwardFill,
  getByHeader,
  isBlank,
  isHeaderRepeat,
  isTrailingSummaryMarker,
  normalizeHeader,
  SheetRows,
  toNumberOrText,
} from "./headerMatch";
import { matchExisting } from "./matchExisting";
import { ProposedChange } from "./types";

// A handful of columns on the richest sheet (סיכום ציונים בוגרים משלימים)
// don't belong in the per-semester course list - they map onto Student's
// own existing fields instead. See the plan's "real file shapes" notes.
const SPECIAL_COLUMNS: Record<string, "finalGrade" | "projectTitle" | "supervisorName"> = {
  "עבודת גמר": "finalGrade",
  "נושא העבודה": "projectTitle",
  "מנחה העבודה": "supervisorName",
};
const PRIOR_DEGREE_COLUMNS: Record<string, "previousCollege" | "degreeField" | "gpa" | "background"> = {
  "היכן למד": "previousCollege",
  "איזה תואר למד": "degreeField",
  "ממוצע התואר": "gpa",
  "נימוק לקבלה": "background",
};
// Read separately below (graduatedText/scholarship) onto Student's own
// fields - excluded here so they don't also get recorded as fake courses
// named "בוגר כן/לא" or "מלגה" in academicHistory/the History tab.
// GENERIC_ELECTIVE_SLOT_NAMES ("קורס ליבה 1" etc) are a sheet's own unfilled-
// slot column headers, not a real course - see its doc comment.
const IGNORED_COLUMNS = new Set([...NON_COURSE_COLUMN_NAMES, ...GENERIC_ELECTIVE_SLOT_NAMES]);
const AVERAGE_COLUMN_PATTERN = /מ?מוצע סמסטר/;

function yearBlockToYearOfStudy(label: string): 1 | 2 | undefined {
  if (label.includes("שנה א")) return 1;
  if (label.includes("שנה ב")) return 2;
  return undefined;
}
function semesterBlockToSemester(label: string): "A" | "B" | undefined {
  if (label.includes("סמסטר א")) return "A";
  if (label.includes("סמסטר ב")) return "B";
  return undefined;
}

interface ColumnPlan {
  courseCols: { col: number; yos: 1 | 2; sem: "A" | "B"; name: string }[];
  averageCols: { col: number; yos: 1 | 2; sem: "A" | "B" }[];
  specialCols: { col: number; target: "finalGrade" | "projectTitle" | "supervisorName" }[];
  priorCols: { col: number; target: "previousCollege" | "degreeField" | "gpa" | "background" }[];
}

function planColumns(headerRow: SheetRows[number], yearBlockRow: string[], semesterBlockRow: string[]): ColumnPlan {
  const plan: ColumnPlan = { courseCols: [], averageCols: [], specialCols: [], priorCols: [] };
  const width = headerRow.length;
  for (let col = 0; col < width; col++) {
    const headerText = normalizeHeader(headerRow[col]);
    if (!headerText) continue;
    if (IGNORED_COLUMNS.has(headerText)) continue;
    if (headerText in SPECIAL_COLUMNS) {
      plan.specialCols.push({ col, target: SPECIAL_COLUMNS[headerText] });
      continue;
    }
    if (headerText in PRIOR_DEGREE_COLUMNS) {
      plan.priorCols.push({ col, target: PRIOR_DEGREE_COLUMNS[headerText] });
      continue;
    }
    const yos = yearBlockToYearOfStudy(yearBlockRow[col] ?? "");
    const sem = semesterBlockToSemester(semesterBlockRow[col] ?? "");
    if (!yos || !sem) continue; // a leading/meta column outside any semester block
    if (AVERAGE_COLUMN_PATTERN.test(headerText)) plan.averageCols.push({ col, yos, sem });
    else plan.courseCols.push({ col, yos, sem, name: headerText });
  }
  return plan;
}

/** Parses one per-semester grade sheet (see the plan's "real file shapes"
 *  notes for the three sources this covers) into proposed Student
 *  create/update actions. `cohortYear` is supplied by the caller (from
 *  which file/sheet this is, decided at upload time) rather than read from
 *  the sheet's own year labels, which have been observed to carry stale
 *  copy-paste text - see SemesterRecord's doc comment in
 *  shared/src/types/student.ts. */
export function parseSemesterGrades(
  rows: SheetRows,
  opts: { cohortYear: HebrewYear; faculty: Faculty; existing: Student[]; track?: StudentTrack }
): ProposedChange[] {
  const headerRowIndex = findHeaderRowIndex(rows, ["שם", "שם המעומד", "שם הסטודנט"]);
  if (headerRowIndex === -1) return [];
  const headerRow = rows[headerRowIndex];
  const headerMap = buildHeaderMap(headerRow);
  const width = headerRow.length;

  const semesterBlockRow = headerRowIndex >= 1 ? forwardFill(rows[headerRowIndex - 1], width) : [];
  const yearBlockRow = headerRowIndex >= 2 ? forwardFill(rows[headerRowIndex - 2], width) : [];
  const plan = planColumns(headerRow, yearBlockRow, semesterBlockRow);

  const changes: ProposedChange[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const fullName = String(getByHeader(row, headerMap, "שם", "שם המעומד", "שם הסטודנט") ?? "").trim();
    if (!fullName) continue;
    if (isHeaderRepeat(fullName, ["שם", "שם המעומד", "שם הסטודנט"])) continue;
    // A trailing stats row (e.g. "ממוצע הקורס"/"חציון") marks the end of the
    // real per-student table - observed followed by an unrelated, unreliable
    // second block (duplicate ID numbers across different people).
    if (isTrailingSummaryMarker(fullName)) break;

    const idNumberRaw = getByHeader(row, headerMap, "ת.ז", "ת.ז.");
    const idNumber = isBlank(idNumberRaw) ? undefined : String(idNumberRaw).trim();

    // Group this row's course/average cells by (yearOfStudy, semester).
    const blocks = new Map<string, { yos: 1 | 2; sem: "A" | "B"; courses: SemesterCourseGrade[]; average?: number }>();
    function block(yos: 1 | 2, sem: "A" | "B") {
      const key = `${yos}-${sem}`;
      if (!blocks.has(key)) blocks.set(key, { yos, sem, courses: [] });
      return blocks.get(key)!;
    }
    for (const c of plan.courseCols) {
      const grade = toNumberOrText(row[c.col]);
      if (grade === undefined) continue;
      block(c.yos, c.sem).courses.push({ name: c.name, grade });
    }
    for (const a of plan.averageCols) {
      const value = row[a.col];
      if (isBlank(value)) continue;
      const n = Number(value);
      if (Number.isFinite(n)) block(a.yos, a.sem).average = n;
    }

    const semesterRecords: SemesterRecord[] = Array.from(blocks.values())
      .filter((b) => b.courses.length > 0 || b.average !== undefined)
      .map((b) => ({
        yearOfStudy: b.yos,
        semester: b.sem,
        hebrewYear: addHebrewYears(opts.cohortYear, b.yos - 1),
        courses: b.courses,
        semesterAverage: b.average,
      }));

    const extra: Partial<Student> = {};
    for (const s of plan.specialCols) {
      const value = row[s.col];
      if (isBlank(value)) continue;
      if (s.target === "finalGrade") {
        const n = Number(value);
        if (Number.isFinite(n)) extra.finalGrade = n;
      } else {
        (extra as any)[s.target] = String(value).trim();
      }
    }
    for (const p of plan.priorCols) {
      const value = row[p.col];
      if (isBlank(value)) continue;
      if (p.target === "gpa") {
        const n = Number(value);
        if (Number.isFinite(n)) extra.gpa = n;
      } else {
        (extra as any)[p.target] = String(value).trim();
      }
    }
    const graduatedText = getByHeader(row, headerMap, "בוגר כן/לא");
    if (!isBlank(graduatedText) && String(graduatedText).trim().startsWith("כן")) {
      extra.status = StudentStatus.GRADUATED_ELIGIBLE;
    }
    const scholarship = getByHeader(row, headerMap, "מלגה");
    if (!isBlank(scholarship)) {
      extra.notes = `מלגה: ${String(scholarship).trim()}`;
    }

    const matchedId = matchExisting({ idNumber, fullName }, opts.existing);
    const matched = matchedId ? opts.existing.find((s) => s.id === matchedId) : undefined;

    changes.push({
      key: `${i}-${fullName}`,
      label: fullName,
      actionLabel: matched ? `עדכון: ${matched.fullName}` : "חדש",
      apply: async () => {
        if (matched) {
          const cohortYear = matched.cohortYear ?? opts.cohortYear;
          await apiFetch(`/api/students/${matched.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              academicHistory: semesterRecords.reduce(
                (hist, rec) => mergeAcademicHistory(hist, rec),
                matched.academicHistory
              ),
              cohortYear,
              ...(extra.status === StudentStatus.GRADUATED_ELIGIBLE
                ? { graduationYear: expectedGraduationYear(cohortYear) }
                : {}),
              ...extra,
            }),
          });
        } else {
          await apiFetch("/api/students", {
            method: "POST",
            body: JSON.stringify({
              fullName,
              idNumber: idNumber ?? "",
              faculty: opts.faculty,
              track: opts.track ?? StudentTrack.REGULAR,
              status: StudentStatus.ACTIVE,
              cohortYear: opts.cohortYear,
              previousCollege: "",
              degreeField: "",
              degreeType: DegreeType.OTHER,
              gpa: 0,
              background: "",
              source: "IMPORTED",
              academicHistory: semesterRecords,
              ...(extra.status === StudentStatus.GRADUATED_ELIGIBLE
                ? { graduationYear: expectedGraduationYear(opts.cohortYear) }
                : {}),
              ...extra,
            }),
          });
        }
      },
    });
  }

  return changes;
}
