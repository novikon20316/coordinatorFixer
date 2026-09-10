"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Faculty, UserRole } from "@admin-coordinator/shared";
import { useAuth } from "./AuthContext";

interface FacultyContextValue {
  /** The faculty every faculty-scoped page (dashboard, candidates, reports,
   *  change-status) should query - a coordinator's own assigned faculty, or
   *  whichever one an admin has picked. */
  faculty: Faculty;
  setFaculty: (faculty: Faculty) => void;
  /** Only an admin (no single assigned facultyId) gets to switch - a
   *  coordinator stays locked to their own department. */
  canChangeFaculty: boolean;
}

const FacultyContext = createContext<FacultyContextValue | undefined>(undefined);

/**
 * Only Data Science has real data today, but every faculty-scoped page has
 * always hardcoded Faculty.DATA_SCIENCE with a "will become a real picker"
 * comment - this is that picker. A coordinator is locked to their own
 * profile.facultyId; only an admin (profile.facultyId is unset) gets to
 * switch faculties, via the selector rendered in SideMenu.
 */
export function FacultyProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === UserRole.ADMIN;
  const [adminFaculty, setAdminFaculty] = useState<Faculty>(Faculty.DATA_SCIENCE);

  const value = useMemo<FacultyContextValue>(
    () => ({
      faculty: isAdmin ? adminFaculty : profile?.facultyId ?? Faculty.DATA_SCIENCE,
      setFaculty: setAdminFaculty,
      canChangeFaculty: isAdmin,
    }),
    [isAdmin, adminFaculty, profile?.facultyId]
  );

  return <FacultyContext.Provider value={value}>{children}</FacultyContext.Provider>;
}

export function useFaculty() {
  const ctx = useContext(FacultyContext);
  if (!ctx) throw new Error("useFaculty must be used within FacultyProvider");
  return ctx;
}
