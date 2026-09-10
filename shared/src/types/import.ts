import { DegreeType, Faculty, StudentStatus, StudentTrack } from "../constants/status";
import { StudentCreateInput } from "./student";

/**
 * Infrastructure for bringing candidate records in from
 * organization-all-system (the sibling HIT system this college is building,
 * which already receives its own data from "המכלול"). There is no live link
 * between the two systems yet - a coordinator has organization-all-system
 * export its user directory to .xlsx (its existing "Import & Export via
 * Excel" admin feature, see userImportExport.ts's buildUsersExportBuffer
 * there) and uploads that file here. This type mirrors that export's exact
 * column layout so the two stay compatible; when a real API linkage exists,
 * only the transport changes; the row shape and mapStudentImportRow below
 * can stay the same.
 *
 * organization-all-system tracks *enrolled* students (their current
 * program), not admissions candidates - it has no notion of previousCollege,
 * degreeField (of a prior degree), gpa, or background. Those fields are left
 * blank by the mapper below for a coordinator to fill in by hand; that's why
 * imported rows are flagged with source: "IMPORTED" on the resulting
 * Student (see StudentImportRow.source usage in mapStudentImportRow).
 */
export interface StudentImportRow {
  Email: string;
  FullNameHe: string;
  FullNameEn?: string;
  /** Only rows with Role "student" are imported; everything else is skipped. */
  Role: string;
  /** organization-all-system's lowercase faculty key, e.g. "data_science". */
  FacultyId: string;
  DegreeType?: string;
  Major?: string;
  YearOfStudy?: string | number;
  StudentId?: string;
}

/** organization-all-system's lowercase Faculty keys -> this system's Faculty enum. */
export const EXTERNAL_FACULTY_ID_MAP: Record<string, Faculty> = {
  sciences: Faculty.SCIENCES,
  electrical: Faculty.ELECTRICAL,
  industrial: Faculty.INDUSTRIAL,
  learning_tech: Faculty.LEARNING_TECH,
  medical_tech: Faculty.MEDICAL_TECH,
  design: Faculty.DESIGN,
  data_science: Faculty.DATA_SCIENCE,
};

export interface StudentImportRowResult {
  row: number;
  fullName: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
}

export interface StudentImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  details: StudentImportRowResult[];
}

export type MappedImportRow =
  | { ok: true; input: StudentCreateInput }
  | { ok: false; reason: string };

/**
 * Maps one raw export row to a creatable Student, defaulting to
 * StudentStatus.ACTIVE and StudentTrack.REGULAR - the admissions-review
 * lifecycle this once used StudentStatus.REGISTERED for now belongs to
 * Candidate (see types/candidate.ts) instead, and the source system has no
 * equivalent of this system's track distinction.
 */
export function mapStudentImportRow(row: StudentImportRow): MappedImportRow {
  const role = (row.Role ?? "").trim().toLowerCase();
  if (role !== "student") {
    return { ok: false, reason: `Not a student row (Role: "${row.Role || "—"}")` };
  }

  const fullName = (row.FullNameHe || row.FullNameEn || "").trim();
  if (!fullName) {
    return { ok: false, reason: "Missing FullNameHe/FullNameEn" };
  }

  const facultyKey = (row.FacultyId ?? "").trim().toLowerCase();
  const faculty = EXTERNAL_FACULTY_ID_MAP[facultyKey];
  if (!faculty) {
    return { ok: false, reason: `Unrecognized FacultyId "${row.FacultyId || "—"}"` };
  }

  return {
    ok: true,
    input: {
      fullName,
      // organization-all-system's export has no תעודת זהות field - StudentId
      // is that system's own internal id, not a real ID number, but it's the
      // closest thing available; left for a coordinator to correct by hand.
      idNumber: row.StudentId ?? "",
      faculty,
      track: StudentTrack.REGULAR,
      status: StudentStatus.ACTIVE,
      // Not available from organization-all-system today - left for a
      // coordinator to complete by hand (see the module comment above).
      previousCollege: "",
      degreeField: row.Major ?? "",
      degreeType: DegreeType.OTHER,
      gpa: 0,
      background: "",
      source: "IMPORTED",
      externalId: row.StudentId || row.Email || undefined,
    },
  };
}
