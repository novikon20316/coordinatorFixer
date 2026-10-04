"use client";

import { he } from "@admin-coordinator/shared";

/**
 * Shown by AppLayout once useIdleTimeout fires. The only way out is the
 * confirm button, which signs the account out and does a full page
 * navigation (not a client-side route change) to /login, so every bit of
 * in-memory app state is dropped along with the session - this is the
 * "refresh + sign out" behavior, deliberate for security/privacy on a
 * shared or unattended machine (see he.auth.idle* for the copy rendered).
 */
export function IdleTimeoutModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="#1d4ed8" strokeWidth="1.6" />
            <path d="M12 7.5V12l3 2" stroke="#1d4ed8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-gray-900">{he.auth.idleTitle}</h2>
        <p className="mt-1 text-sm font-semibold text-gray-900">{he.auth.idleHeading}</p>

        <p className="mt-3 text-sm text-gray-500">{he.auth.idleBodyHe}</p>
        <p className="mt-2 text-sm text-gray-500">{he.auth.idleBodyEn}</p>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onConfirm}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            {he.auth.idleConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
