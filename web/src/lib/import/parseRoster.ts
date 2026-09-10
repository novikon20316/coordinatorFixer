import { addHebrewYears, DegreeType, Faculty, HebrewYear, Student, StudentStatus, StudentTrack } from "@admin-coordinator/shared";
import { apiFetch } from "../apiClient";
import {
  buildHeaderMap,
  findHeaderRowIndex,
  getByHeader,
  isBlank,
  isHeaderRepeat,
  isTrailingSummaryMarker,
  SheetRows,
} from "./headerMatch";
import { matchExisting } from "./matchExisting";
import { ProposedChange } from "./types";

/** Parses a plain registrar roster (שם / ת.ז / שנה פדגוגית / שלוחה / מסלול)
 *  into proposed Student create/update actions - mainly useful to backfill
 *  a student's idNumber/cohortYear/track from an authoritative source.
 *  `asOfYear` is the Hebrew year the roster itself is dated (from the
 *  filename), used with the row's "שנה פדגוגית" (א/ב) to derive cohortYear:
 *  a "שנה ב" row started the program one Hebrew year before the roster. */
export function parseRoster(
  rows: SheetRows,
  opts: { asOfYear: HebrewYear; faculty: Faculty; existing: Student[] }
): ProposedChange[] {
  const headerRowIndex = findHeaderRowIndex(rows, ["שם"]);
  if (headerRowIndex === -1) return [];
  const headerMap = buildHeaderMap(rows[headerRowIndex]);

  const changes: ProposedChange[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const fullName = String(getByHeader(row, headerMap, "שם") ?? "").trim();
    if (!fullName) continue;
    if (isHeaderRepeat(fullName, ["שם"])) continue;
    if (isTrailingSummaryMarker(fullName)) break;

    const idNumberRaw = getByHeader(row, headerMap, "ת.ז.", "ת.ז");
    const idNumber = isBlank(idNumberRaw) ? undefined : String(idNumberRaw).trim();

    const pedagogicalYear = String(getByHeader(row, headerMap, "שנה פדגוגית") ?? "").trim();
    const cohortYear = pedagogicalYear === "ב" ? addHebrewYears(opts.asOfYear, -1) : opts.asOfYear;

    const trackText = String(getByHeader(row, headerMap, "מסלול") ?? "");
    const track = trackText.includes("השלמה") || trackText.includes("משלים") ? StudentTrack.COMPLETION : StudentTrack.REGULAR;

    const matchedId = matchExisting({ idNumber, fullName }, opts.existing);
    const matched = matchedId ? opts.existing.find((s) => s.id === matchedId) : undefined;

    changes.push({
      key: `${i}-${fullName}`,
      label: fullName,
      actionLabel: matched ? `עדכון: ${matched.fullName}` : "חדש",
      apply: async () => {
        if (matched) {
          await apiFetch(`/api/students/${matched.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              idNumber: idNumber ?? matched.idNumber,
              cohortYear,
              track,
            }),
          });
        } else {
          await apiFetch("/api/students", {
            method: "POST",
            body: JSON.stringify({
              fullName,
              idNumber: idNumber ?? "",
              faculty: opts.faculty,
              track,
              status: StudentStatus.ACTIVE,
              cohortYear,
              previousCollege: "",
              degreeField: "",
              degreeType: DegreeType.OTHER,
              gpa: 0,
              background: "",
              source: "IMPORTED",
            }),
          });
        }
      },
    });
  }

  return changes;
}
