"use client";

export function TrackTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  /** `badge`: shows a small dot on that tab, e.g. to signal a student on it
   *  needs the coordinator's attention - independent of the active/inactive
   *  styling. */
  options: { value: T; label: string; badge?: boolean }[];
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative rounded-md px-5 py-2 text-sm font-semibold transition-colors ${
              active ? "bg-blue-700 text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {opt.label}
            {opt.badge && (
              <span
                className="absolute -top-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
