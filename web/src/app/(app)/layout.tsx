"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../../context/AuthContext";
import { FacultyProvider } from "../../context/FacultyContext";
import { SideMenu } from "../../components/SideMenu";
import { IdleTimeoutModal } from "../../components/IdleTimeoutModal";
import { useIdleTimeout } from "../../hooks/useIdleTimeout";

// Admin accounts here can see every candidate/student's personal data, so a
// session left open on a shared or unattended machine shouldn't stay signed
// in indefinitely - force a re-login after this long without any mouse,
// keyboard, touch, or scroll activity.
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, profileLoading, loading, isFirebaseConfigured, logout } = useAuth();
  const router = useRouter();
  const idle = useIdleTimeout(IDLE_TIMEOUT_MS, Boolean(user) && !loading);

  useEffect(() => {
    if (!loading && !user && isFirebaseConfigured) {
      router.replace("/login");
    }
  }, [user, loading, isFirebaseConfigured, router]);

  // A full navigation (not a client-side route change) so every bit of
  // in-memory app state is dropped along with the session, not just the
  // auth token - the idle dialog is explicitly a "start over clean" prompt.
  async function handleIdleConfirm() {
    await logout();
    window.location.assign("/login");
  }

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
    <FacultyProvider>
      <div className="flex min-h-screen flex-col sm:flex-row">
        <SideMenu />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
      {idle && <IdleTimeoutModal onConfirm={handleIdleConfirm} />}
    </FacultyProvider>
  );
}
