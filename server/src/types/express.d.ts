import { UserRole } from "@admin-coordinator/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
