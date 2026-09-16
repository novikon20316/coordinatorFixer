"use client";

import { useCallback, useRef } from "react";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 280;

/**
 * A movable, resizable floating window: drag anywhere marked
 * `data-drag-handle` inside `children` (a title bar, typically) to move it,
 * or the corner grip to resize it. Position/size live in the caller (see
 * DetailPanelsContext) so several of these can be open independently.
 */
export function FloatingPanel({
  x,
  y,
  width,
  height,
  zIndex,
  onMove,
  onResize,
  onFocus,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onFocus: () => void;
  children: React.ReactNode;
}) {
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; originW: number; originH: number } | null>(null);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      const state = dragState.current;
      if (!state) return;
      onMove(state.originX + (e.clientX - state.startX), state.originY + (e.clientY - state.startY));
    },
    [onMove]
  );

  const stopDrag = useCallback(() => {
    dragState.current = null;
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", stopDrag);
  }, [handleDragMove]);

  const handlePanelMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      onFocus();
      const target = e.target as HTMLElement;
      if (target.closest("button, input, select, textarea, a")) return;
      if (!target.closest("[data-drag-handle]")) return;
      dragState.current = { startX: e.clientX, startY: e.clientY, originX: x, originY: y };
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", stopDrag);
    },
    [onFocus, x, y, handleDragMove, stopDrag]
  );

  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      const state = resizeState.current;
      if (!state) return;
      onResize(
        Math.max(MIN_WIDTH, state.originW + (e.clientX - state.startX)),
        Math.max(MIN_HEIGHT, state.originH + (e.clientY - state.startY))
      );
    },
    [onResize]
  );

  const stopResize = useCallback(() => {
    resizeState.current = null;
    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", stopResize);
  }, [handleResizeMove]);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFocus();
      resizeState.current = { startX: e.clientX, startY: e.clientY, originW: width, originH: height };
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", stopResize);
    },
    [onFocus, width, height, handleResizeMove, stopResize]
  );

  return (
    <div
      onMouseDown={handlePanelMouseDown}
      style={{ position: "fixed", left: x, top: y, width, height, zIndex }}
      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
    >
      {children}
      <div
        onMouseDown={startResize}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize text-gray-300 hover:text-gray-500"
        aria-hidden
      >
        <svg viewBox="0 0 16 16" className="h-full w-full">
          <path d="M14 2 L2 14 M14 6 L6 14 M14 10 L10 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}
