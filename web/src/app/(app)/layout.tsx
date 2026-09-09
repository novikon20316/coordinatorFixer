"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../../context/AuthContext";
import { SideMenu } from "../../components/SideMenu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, profileLoading, loading, isFirebaseConfigured, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && isFirebaseConfigured) {
      router.replace("/login");
    }
  }, [user, loading, isFirebaseConfigured, router]);

  if (loading || (user && profileLoading)) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        {he.common.loading}
      </div>
    );
  }

  // A Firebase Auth session exists (this matters most for Google/Apple
  // sign-in, which auto-creates the Auth account for anyone regardless of
  // whether an admin ever provisioned them) but no users/{uid} profile does
  // - Firestore rules already deny this account read access to everything
  // else, so make that explicit instead of rendering an empty dashboard.
  if (user && !profileLoading && !profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-sm text-red-600">{he.auth.noAccount}</p>
        <button onClick={logout} className="text-sm text-blue-700 hover:underline">
          {he.auth.logout}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-row">
      <SideMenu />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
