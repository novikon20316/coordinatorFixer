import { Faculty, UserRole } from "../constants/status";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  /** Required for COORDINATOR accounts; absent for the system-wide ADMIN. */
  facultyId?: Faculty;
  isActive: boolean;
  createdAt: string;
}

export interface CoordinatorCreateInput {
  email: string;
  password: string;
  displayName: string;
  facultyId: Faculty;
}
