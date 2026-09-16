"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Student } from "@admin-coordinator/shared";

export interface PanelLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}

export interface OpenDetailPanel {
  student: Student;
  layout: PanelLayout;
}

interface DetailPanelsContextValue {
  openPanels: OpenDetailPanel[];
  openDetail: (student: Student) => void;
  closeDetail: (studentId: string) => void;
  updateLayout: (studentId: string, patch: Partial<PanelLayout>) => void;
  focusPanel: (studentId: string) => void;
}

const DetailPanelsContext = createContext<DetailPanelsContextValue | undefined>(undefined);

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 520;
// Cascades each newly opened panel a bit further down/right than the last
// (wrapping after a few) so they don't all land in exactly the same spot.
const CASCADE_STEP = 32;
const CASCADE_WRAP = 6;
const CASCADE_ORIGIN = 72;

/** Lets several students' "פרטים נוספים" panels stay open at once, each an
 *  independently draggable/resizable floating window (see FloatingPanel and
 *  FloatingDetailPanels) instead of each StudentCard owning its own single
 *  full-screen modal - a coordinator comparing students no longer has to
 *  close one panel before opening the next, and can arrange them however
 *  suits the comparison. */
export function DetailPanelsProvider({ children }: { children: React.ReactNode }) {
  const [openPanels, setOpenPanels] = useState<OpenDetailPanel[]>([]);
  // A ref, not state - only the panel's own stored z needs to trigger a
  // render, this counter is just bookkeeping for "what's the next highest".
  const topZRef = useRef(50);

  const openDetail = useCallback((student: Student) => {
    setOpenPanels((prev) => {
      if (prev.some((p) => p.student.id === student.id)) return prev;
      const step = (prev.length % CASCADE_WRAP) * CASCADE_STEP;
      topZRef.current += 1;
      return [
        ...prev,
        {
          student,
          layout: {
            x: CASCADE_ORIGIN + step,
            y: CASCADE_ORIGIN + step,
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            z: topZRef.current,
          },
        },
      ];
    });
  }, []);

  const closeDetail = useCallback((studentId: string) => {
    setOpenPanels((prev) => prev.filter((p) => p.student.id !== studentId));
  }, []);

  const updateLayout = useCallback((studentId: string, patch: Partial<PanelLayout>) => {
    setOpenPanels((prev) =>
      prev.map((p) => (p.student.id === studentId ? { ...p, layout: { ...p.layout, ...patch } } : p))
    );
  }, []);

  const focusPanel = useCallback((studentId: string) => {
    topZRef.current += 1;
    const z = topZRef.current;
    setOpenPanels((prev) =>
      prev.map((p) => (p.student.id === studentId && p.layout.z !== z ? { ...p, layout: { ...p.layout, z } } : p))
    );
  }, []);

  const value = useMemo(
    () => ({ openPanels, openDetail, closeDetail, updateLayout, focusPanel }),
    [openPanels, openDetail, closeDetail, updateLayout, focusPanel]
  );

  return <DetailPanelsContext.Provider value={value}>{children}</DetailPanelsContext.Provider>;
}

export function useDetailPanels() {
  const ctx = useContext(DetailPanelsContext);
  if (!ctx) throw new Error("useDetailPanels must be used within DetailPanelsProvider");
  return ctx;
}
