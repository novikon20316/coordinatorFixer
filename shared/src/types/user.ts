import { UserRole } from "../constants/status";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}
