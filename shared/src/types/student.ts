import { DegreeType, Faculty, StudentStatus, StudentTrack } from "../constants/status";

export interface Student {
  id: string;
  fullName: string;
  faculty: Faculty;
  track: StudentTrack;
  status: StudentStatus;

  /** המכללה האקדמית הקודמת */
  previousCollege: string;
  /** תחום התואר (מדעי המחשב, הנדסת חשמל ואלקטרוניקה, מדעי הרוח וכו') */
  degreeField: string;
  /** סוג התואר */
  degreeType: DegreeType;
  /** ממוצע ציונים בתואר */
  gpa: number;
  /** רקע התלמיד - ניסיון תעסוקתי / עיסוק */
  background: string;

  /**
   * How this record entered the system. Absent/"MANUAL" for records created
   * one-by-one via the dashboard's "add student" form. "IMPORTED" for rows
   * brought in through the bulk import (see StudentImportRow in
   * types/import.ts) - the dashboard uses this to flag records that likely
   * still need a coordinator to fill in fields the source system doesn't
   * have (previousCollege/degreeField/gpa/background).
   */
  source?: "MANUAL" | "IMPORTED";
  /**
   * The id of this person in the source system an import came from (e.g. the
   * organization-all-system Firebase uid), kept so a future automatic sync
   * can recognize a student it already imported instead of creating a
   * duplicate. Never set for manually-created records.
   */
  externalId?: string;

  createdAt: string;
  updatedAt: string;
}

export type StudentCreateInput = Omit<Student, "id" | "createdAt" | "updatedAt">;
export type StudentUpdateInput = Partial<StudentCreateInput>;

export interface StudentFilters {
  faculty?: Faculty;
  track?: StudentTrack;
  status?: StudentStatus;
  degreeType?: DegreeType;
  previousCollege?: string;
  degreeField?: string;
  minGpa?: number;
  maxGpa?: number;
}
