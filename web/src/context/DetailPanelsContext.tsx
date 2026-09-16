"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Student } from "@admin-coordinator/shared";

interface DetailPanelsContextValue {
  openStudents: Student[];
  openDetail: (student: Student) => void;
  closeDetail: (studentId: string) => void;
}

const DetailPanelsContext = createContext<DetailPanelsContextValue | undefined>(undefined);

/** Lets several students' "פרטים נוספים" panels stay open side by side (see
 *  DetailPanelsDock) instead of each StudentCard owning its own single
 *  full-screen modal - a coordinator comparing students no longer has to
 *  close one panel before opening the next. */
export function DetailPanelsProvider({ children }: { children: React.ReactNode }) {
  const [openStudents, setOpenStudents] = useState<Student[]>([]);

  const openDetail = useCallback((student: Student) => {
    setOpenStudents((prev) => (prev.some((s) => s.id === student.id) ? prev : [...prev, student]));
  }, []);

  const closeDetail = useCallback((studentId: string) => {
    setOpenStudents((prev) => prev.filter((s) => s.id !== studentId));
  }, []);

  const value = useMemo(() => ({ openStudents, openDetail, closeDetail }), [openStudents, openDetail, closeDetail]);

  return <DetailPanelsContext.Provider value={value}>{children}</DetailPanelsContext.Provider>;
}

export function useDetailPanels() {
  const ctx = useContext(DetailPanelsContext);
  if (!ctx) throw new Error("useDetailPanels must be used within DetailPanelsProvider");
  return ctx;
}
