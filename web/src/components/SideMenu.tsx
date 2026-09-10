"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { he, UserRole } from "@admin-coordinator/shared";
import { useAuth } from "../context/AuthContext";

const ITEMS = [
  { href: "/dashboard", label: he.menu.overview },
  { href: "/candidates", label: he.menu.candidates },
  { href: "/reports", label: he.menu.reports },
  { href: "/change-status", label: he.menu.changeStatus },
];

export function SideMenu() {
  const pathname = usePathname();
  const { logout, profile } = useAuth();

  const items =
    profile?.role === UserRole.ADMIN
      ? [...ITEMS, { href: "/coordinators", label: he.menu.coordinators }]
      : ITEMS;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="px-5 py-6">
        <span className="text-lg font-bold text-blue-900">{he.app.name}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
  );
}
