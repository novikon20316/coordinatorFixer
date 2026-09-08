"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../../context/AuthContext";
import { SideMenu } from "../../components/SideMenu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && isFirebaseConfigured) {
      router.replace("/login");
    }
  }, [user, loading, isFirebaseConfigured, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        {he.common.loading}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-row-reverse">
      <SideMenu />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
