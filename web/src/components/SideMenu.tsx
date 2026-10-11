"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Faculty, FACULTY_VALUES, he, UserRole } from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";
import { useFaculty } from "../context/FacultyContext";

const ITEMS = [
  { href: "/dashboard", label: he.menu.overview },
  { href: "/candidates", label: he.menu.candidates },
  { href: "/reports", label: he.menu.reports },
  { href: "/change-status", label: he.menu.changeStatus },
  { href: "/history", label: he.menu.history },
];

export function SideMenu() {
  const pathname = usePathname();
  const { logout, profile } = useAuth();
  const { faculty, setFaculty, canChangeFaculty } = useFaculty();
  // Closed by default - on a narrow (mobile) screen the nav itself renders as
  // a slide-in drawer (see the `aside` classes below) instead of the always-
  // visible static column it is from md: up, where this state is never read.
  const [mobileOpen, setMobileOpen] = useState(false);

  const items =
    profile?.role === UserRole.ADMIN
      ? [
          ...ITEMS,
          { href: "/coordinators", label: he.menu.coordinators },
          { href: "/curriculum-corrections", label: he.menu.curriculumCorrections },
        ]
      : ITEMS;

  return (
    <>
      {/* Mobile-only top bar - the sm: sidebar below replaces this entirely
          on wider screens, where it's hidden via sm:hidden. */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:hidden">
        <span className="text-lg font-bold text-blue-900">{he.app.name}</span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label={he.menu.openMenu}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-200 sm:static sm:z-auto sm:w-56 sm:max-w-none sm:translate-x-0 sm:shrink-0 sm:shadow-none ${
          mobileOpen ? "translate-x-0" : "translate-x-full sm:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-6 sm:justify-start">
          <span className="text-lg font-bold text-blue-900">{he.app.name}</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={he.menu.closeMenu}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 sm:hidden"
          >
            ✕
          </button>
        </div>
        {canChangeFaculty && (
          <div className="px-3 pb-4">
            <label className="flex flex-col gap-1 text-xs text-gray-500">
              {he.menu.facultyFilter}
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value as Faculty)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {FACULTY_VALUES.map((f) => (
                  <option key={f} value={f}>
                    {he.faculty[f]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-blue-50 text-blue-800" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={logout}
            className="w-full rounded-md px-3 py-2 text-right text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {he.auth.logout}
          </button>
        </div>
      </aside>
    </>
  );
}
