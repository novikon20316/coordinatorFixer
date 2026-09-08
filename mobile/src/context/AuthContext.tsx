import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
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
        await sendPasswordResetEmail(auth, email);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
