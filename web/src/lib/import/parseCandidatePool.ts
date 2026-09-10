import {
  Candidate,
  CandidateCreateInput,
  CandidateStatus,
  Faculty,
  HebrewYear,
} from "@admin-coordinator/shared";
import { apiFetch } from "../apiClient";
import {
  buildHeaderMap,
  findHeaderRowIndex,
  getByHeader,
  isBlank,
  isHeaderRepeat,
  isTrailingSummaryMarker,
  SheetRows,
  toNumberOrText,
} from "./headerMatch";
import { matchExisting } from "./matchExisting";
import { ProposedChange } from "./types";

// Column header variants observed across the older (richer) and newer
// (leaner) candidate-pool file formats - see the plan's "real file shapes"
// notes. Each group's first alias is used as the canonical label on the
// resulting completionCourses entries.
const COMPLETION_COURSE_ALIASES: string[][] = [
  ["הסתברות"],
  ["סטטיסטיקה", "סטטסטיקה"],
  ["אלגברה לינארית", "אלגברה לניארית"],
  ["חשבון אינפי", "חשבון אינפיניטסימלי 1"],
  ["פייתון", "מבוא לתכנות בשפת פייתון"],
  ["בסיסי נתונים", "ניתוח ועיצוב בסיסי נתונים"],
];

function parseAcceptanceDecision(row: SheetRows[number], headerMap: ReturnType<typeof buildHeaderMap>) {
  if (!isBlank(getByHeader(row, headerMap, "מן המניין", "מהמניין"))) return "REGULAR" as const;
  if (!isBlank(getByHeader(row, headerMap, "על תנאי"))) return "CONDITIONAL" as const;
  if (!isBlank(getByHeader(row, headerMap, "לא מן המניין"))) return "NOT_REGULAR" as const;
  return "" as const;
}

/** Parses one candidate-pool sheet (a dedicated מועמדים file, or sheet
 *  "גיליון1" of a סטודנטים file) into proposed Candidate create/update
 *  actions, matched against `existing` by ID number where present, else by
 *  normalized full name. */
export function parseCandidatePool(
  rows: SheetRows,
  opts: { applyingForYear: HebrewYear; faculty: Faculty; existing: Candidate[] }
): ProposedChange[] {
  const headerRowIndex = findHeaderRowIndex(rows, ["שם המעומד", "שם"]);
  if (headerRowIndex === -1) return [];
  const headerMap = buildHeaderMap(rows[headerRowIndex]);

  const changes: ProposedChange[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const fullName = String(getByHeader(row, headerMap, "שם המעומד", "שם") ?? "").trim();
    if (!fullName) continue;
    // A few files reprint the header row before a second batch of real
    // candidates further down - skip just that row, not the rows after it.
    if (isHeaderRepeat(fullName, ["שם המעומד", "שם"])) continue;
    // A trailing stats/summary row signals the real table has ended.
    if (isTrailingSummaryMarker(fullName)) break;

    const idNumberRaw = getByHeader(row, headerMap, "ת.ז", "ת.ז.");
    const idNumber = isBlank(idNumberRaw) ? undefined : String(idNumberRaw).trim();

    const completionCourses = COMPLETION_COURSE_ALIASES.map((aliases) => ({
      name: aliases[0],
      grade: toNumberOrText(getByHeader(row, headerMap, ...aliases)),
    })).filter((c) => c.grade !== undefined);

    const input: CandidateCreateInput = {
      fullName,
      idNumber,
      faculty: opts.faculty,
      applyingForYear: opts.applyingForYear,
      previousCollege: String(getByHeader(row, headerMap, "מוסד קודם", "מוסד") ?? ""),
      // "תחום" (field, e.g. "מדעי המחשב") must be checked before bare "תואר" -
      // the older candidate-file format has both, and "תואר" there is the
      // degree *type* (BSC/BA), not the field. Newer files only have "שם
      // התואר" (a full degree-name description), unaffected by this order.
      degreeField: String(getByHeader(row, headerMap, "שם התואר", "תחום", "תואר") ?? ""),
      gpa: Number(getByHeader(row, headerMap, "ממוצע")) || 0,
      background: String(getByHeader(row, headerMap, "רקע") ?? ""),
      completionCourses: completionCourses.length > 0 ? completionCourses : undefined,
      completionAverage:
        Number(getByHeader(row, headerMap, "ממוצע השלמות", "ממוצע מהשלמות")) || undefined,
      acceptanceDecision: parseAcceptanceDecision(row, headerMap),
      committeeNotes: String(
        getByHeader(row, headerMap, "חוות דעת של הוועדה", "חוות דעת הוועדה", "הערות") ?? ""
      ),
      status: CandidateStatus.PENDING,
      source: "IMPORTED",
    };

    const matchedId = matchExisting({ idNumber, fullName }, opts.existing);
    const matched = matchedId ? opts.existing.find((c) => c.id === matchedId) : undefined;

    changes.push({
      key: `${i}-${fullName}`,
      label: fullName,
      actionLabel: matched ? `עדכון: ${matched.fullName}` : "חדש",
      apply: async () => {
        if (matchedId) {
          await apiFetch(`/api/candidates/${matchedId}`, { method: "PATCH", body: JSON.stringify(input) });
        } else {
          await apiFetch("/api/candidates", { method: "POST", body: JSON.stringify(input) });
        }
      },
    });
  }

  return changes;
}
