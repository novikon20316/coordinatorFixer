"use client";

import { useDetailPanels } from "../context/DetailPanelsContext";
import { StudentDetailModal } from "./StudentDetailModal";

/** Renders every currently-open "פרטים נוספים" panel side by side in a
 *  bottom-docked, horizontally-scrolling strip - lets a coordinator open
 *  several students' panels at once to compare them, instead of each one
 *  replacing the last. */
export function DetailPanelsDock() {
  const { openStudents, closeDetail } = useDetailPanels();

  if (openStudents.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center border-t border-gray-200 bg-white/90 p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <div className="flex max-w-full gap-3 overflow-x-auto">
        {openStudents.map((student) => (
          <StudentDetailModal key={student.id} student={student} onClose={() => closeDetail(student.id)} />
        ))}
      </div>
    </div>
  );
}

/** Reserved bottom space for the card grid to add while the dock is open -
 *  bigger than a panel's own max-height (StudentDetailModal's "max-h-[28rem]")
 *  plus the dock's padding/border, so a coordinator can still scroll another
 *  card's own "פרטים נוספים" button into view above the dock instead of the
 *  dock (fixed, on top of everything) permanently covering it. */
export const DETAIL_PANELS_DOCK_RESERVED_SPACE_CLASS = "pb-[32rem]";
