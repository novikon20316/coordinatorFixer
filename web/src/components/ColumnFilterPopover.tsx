"use client";

import { useEffect, useRef, useState } from "react";
import { he } from "@admin-coordinator/shared";

/**
 * Small multi-select popover opened by clicking a table column header (see
 * change-status/page.tsx). Selections only take effect once the filter
 * button is pressed - closing the popover any other way (outside click,
 * Escape) discards the in-progress selection and keeps whatever filter was
 * already applied.
 */
export function ColumnFilterPopover<T extends string>({
  options,
  selected,
  onApply,
  onClose,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onApply: (values: T[]) => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<T[]>(selected);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-column-filter-trigger]")) return;
      if (ref.current && !ref.current.contains(target)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function toggle(value: T) {
    setPending((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white p-3 text-right font-normal normal-case text-gray-700 shadow-lg"
    >
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center justify-end gap-2 text-sm">
            {opt.label}
            <input type="checkbox" checked={pending.includes(opt.value)} onChange={() => toggle(opt.value)} />
          </label>
        ))}
      </div>
      <button
        onClick={() => {
          onApply(pending);
          onClose();
        }}
        className="mt-3 w-full rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
      >
        {he.changeStatus.columnFilterApply}
      </button>
    </div>
  );
}
