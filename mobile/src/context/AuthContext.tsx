import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import * as AppleAuthentication from "expo-apple-authentication";
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
  /** True from the moment `user` is set until the first profile read
   *  resolves (found or not) - lets callers avoid treating "still loading"
   *  as "no account" (relevant for Google/Apple sign-in, which auto-creates
   *  the Firebase Auth account regardless of whether an admin ever
   *  provisioned this person as an app user). */
  profileLoading: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Completes Google sign-in given the id_token from
   *  expo-auth-session/providers/google's useAuthRequest - that hook has to
   *  live in the screen component, so the screen calls this once it has a
   *  token rather than this context driving the whole flow. */
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
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

  // Live-subscribed so an admin disabling this account is reflected
  // immediately, not just on next app launch.
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
      loginWithGoogleIdToken: async (idToken) => {
        if (!auth) throw new Error("Firebase is not configured yet");
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      },
      loginWithApple: async () => {
        if (!auth) throw new Error("Firebase is not configured yet");
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        if (!isAvailable) throw new Error("Sign in with Apple is not available on this device/build");

        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) throw new Error("Apple sign-in returned no identity token");

        const provider = new OAuthProvider("apple.com");
        const firebaseCredential = provider.credential({ idToken: credential.identityToken });
        await signInWithCredential(auth, firebaseCredential);
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
