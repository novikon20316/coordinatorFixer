"use client";

import { he } from "@admin-coordinator/shared";
import { useDetailPanels } from "../context/DetailPanelsContext";
import { FloatingPanel } from "./FloatingPanel";
import { StudentDetailModal, STATUS_STYLES } from "./StudentDetailModal";

/** Renders every currently-open "פרטים נוספים" panel as its own floating,
 *  draggable, resizable window (see FloatingPanel) - lets a coordinator open
 *  several students' panels at once and arrange them side by side to
 *  compare, instead of one replacing the last or all of them being pinned
 *  to a fixed dock. */
export function FloatingDetailPanels() {
  const { openPanels, closeDetail, updateLayout, focusPanel } = useDetailPanels();

  return (
    <>
      {openPanels.map(({ student, layout }) => (
        <FloatingPanel
          key={student.id}
          x={layout.x}
          y={layout.y}
          width={layout.width}
          height={layout.height}
          zIndex={layout.z}
          onMove={(x, y) => updateLayout(student.id, { x, y })}
          onResize={(width, height) => updateLayout(student.id, { width, height })}
          onFocus={() => focusPanel(student.id)}
        >
          <div
            data-drag-handle
            className="flex shrink-0 cursor-move items-center justify-between gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-4 py-2.5"
          >
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-gray-900">{student.fullName}</h2>
              <p className="text-xs text-gray-500">{he.studentDetail.title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[student.status]}`}
              >
                {he.status[student.status]}
              </span>
              <button
                type="button"
                onClick={() => closeDetail(student.id)}
                aria-label={he.studentDetail.close}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>
          <StudentDetailModal student={student} onClose={() => closeDetail(student.id)} />
        </FloatingPanel>
      ))}
    </>
  );
}
