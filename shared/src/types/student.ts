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
