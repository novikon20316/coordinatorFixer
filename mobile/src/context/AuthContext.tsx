import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { AppUser } from "@admin-coordinator/shared";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";

// Firebase's own hosted reset-password page isn't reliable on a brand-new
// project - point the reset link at the web app's /reset-password page
// instead (opened in the phone's browser), which calls confirmPasswordReset
// directly. EXPO_PUBLIC_APP_URL should be set to the deployed web URL in prod.
const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3000";

interface AuthContextValue {
  user: User | null;
  /** This account's own users/{uid} Firestore doc - role, facultyId, isActive. */
  profile: AppUser | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Live-subscribed so an admin disabling this account is reflected
  // immediately, not just on next app launch.
  useEffect(() => {
    if (!db || !user) {
      setProfile(null);
      return;
    }
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as AppUser) : null);
    });
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isFirebaseConfigured,
      login: async (email, password) => {
        if (!auth) throw new Error("Firebase is not configured yet");
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        if (!auth) return;
        await signOut(auth);
      },
      sendResetEmail: async (email) => {
        if (!auth) throw new Error("Firebase is not configured yet");
        await sendPasswordResetEmail(auth, email, {
          url: `${APP_URL}/reset-password`,
          handleCodeInApp: true,
        });
      },
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
