"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { AppUser } from "@admin-coordinator/shared";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";

// Firebase's own hosted reset-password page (<project>.firebaseapp.com/__/auth/action)
// isn't reliable on a brand-new project - point the emailed/generated link at
// our own /reset-password page instead, which calls confirmPasswordReset
// directly. NEXT_PUBLIC_APP_URL should be set to the deployed web URL in prod.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface AuthContextValue {
  user: User | null;
  /** This account's own users/{uid} Firestore doc - role, facultyId, isActive.
   *  null while loading OR when a signed-in Firebase Auth user (e.g. from
   *  Google/Apple sign-in) has no matching app account - check
   *  profileLoading to tell the two apart. */
  profile: AppUser | null;
  /** True from the moment `user` is set until the first profile read
   *  resolves (found or not) - lets callers avoid treating "still loading"
   *  as "no account". */
  profileLoading: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Live-subscribed (not a one-off fetch) so an admin flipping isActive:false
  // on this account is reflected immediately, not just on next page load.
  // A signed-in Firebase Auth user with no users/{uid} doc (possible with
  // Google/Apple sign-in - Firebase auto-creates the Auth account regardless
  // of whether an admin ever provisioned this person) resolves to profile:
  // null same as before, but callers can now tell that apart from "still
  // loading" via profileLoading.
  useEffect(() => {
    if (!db || !user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setProfile(snap.exists() ? ({ uid: snap.id, ...snap.data() } as AppUser) : null);
        setProfileLoading(false);
      },
      () => {
        // Rules deny the read (e.g. no profile doc, or an inactive account
        // that Firestore itself can't resolve a role for) - same outcome as
        // "no profile", not an app error.
        setProfile(null);
        setProfileLoading(false);
      }
    );
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      profileLoading,
      loading,
      isFirebaseConfigured,
      login: async (email, password) => {
        if (!auth) throw new Error("Firebase is not configured yet");
        await signInWithEmailAndPassword(auth, email, password);
      },
      loginWithGoogle: async () => {
        if (!auth) throw new Error("Firebase is not configured yet");
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      loginWithApple: async () => {
        if (!auth) throw new Error("Firebase is not configured yet");
        const provider = new OAuthProvider("apple.com");
        provider.addScope("email");
        provider.addScope("name");
        await signInWithPopup(auth, provider);
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
    [user, profile, profileLoading, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
