"use client";

import { he, STUDENT_TRACK_VALUES, StudentTrack } from "@admin-coordinator/shared";

export function TrackTabs({
  value,
  onChange,
}: {
  value: StudentTrack;
  onChange: (track: StudentTrack) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      {STUDENT_TRACK_VALUES.map((track) => {
        const active = track === value;
        return (
          <button
            key={track}
            onClick={() => onChange(track)}
            className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${
              active ? "bg-blue-700 text-white" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {he.dashboard.tabs[track]}
          </button>
        );
      })}
    </div>
  );
}
