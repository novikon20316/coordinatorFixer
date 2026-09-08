"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login, loginWithGoogle, loginWithApple, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialSubmitting, setSocialSubmitting] = useState<"google" | "apple" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch {
      setError(he.auth.invalidCredentials);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSocial(provider: "google" | "apple") {
    setError(null);
    setSocialSubmitting(provider);
    try {
      await (provider === "google" ? loginWithGoogle() : loginWithApple());
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof FirebaseError) {
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
          // user cancelled - not an error worth showing
        } else if (err.code === "auth/account-exists-with-different-credential") {
          setError(he.auth.accountExistsDifferentMethod);
        } else {
          setError(he.auth.socialSignInFailed);
        }
      } else {
        setError(he.auth.socialSignInFailed);
      }
    } finally {
      setSocialSubmitting(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <p className="text-center text-lg font-bold text-blue-900">{he.app.name}</p>
        <h1 className="mt-1 mb-6 text-center text-2xl font-bold text-gray-900">
          {he.auth.loginTitle}
        </h1>

        {!isFirebaseConfigured && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
            Firebase טרם חובר - זהו מסך הדגמה
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{he.auth.email}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">{he.auth.password}</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-blue-700 py-2 font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? he.common.loading : he.auth.login}
          </button>
        </form>

        <Link
          href="/forgot-password"
          className="mt-4 block text-center text-sm text-blue-700 hover:underline"
        >
          {he.auth.forgotPassword}
        </Link>

        <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          {he.auth.or}
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleSocial("google")}
            disabled={socialSubmitting !== null}
            className="flex items-center justify-center gap-2 rounded-md border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <GoogleIcon />
            {socialSubmitting === "google" ? he.common.loading : he.auth.continueWithGoogle}
          </button>

          <button
            type="button"
            onClick={() => handleSocial("apple")}
            disabled={socialSubmitting !== null}
            className="flex items-center justify-center gap-2 rounded-md bg-black py-2 text-sm font-medium text-white transition-colors hover:bg-gray-900 disabled:opacity-60"
          >
            <AppleIcon />
            {socialSubmitting === "apple" ? he.common.loading : he.auth.continueWithApple}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true" fill="#fff">
      <path d="M13.1 9.53c-.02-2.03 1.66-3.01 1.73-3.05-.94-1.38-2.41-1.57-2.93-1.59-1.25-.13-2.44.74-3.07.74-.63 0-1.6-.72-2.64-.7-1.36.02-2.61.79-3.31 2.01-1.41 2.44-.36 6.05 1.01 8.03.67.97 1.47 2.06 2.52 2.02 1.01-.04 1.39-.65 2.61-.65 1.21 0 1.56.65 2.63.63 1.09-.02 1.78-.98 2.44-1.96.77-1.12 1.09-2.21 1.1-2.27-.02-.01-2.1-.81-2.12-3.21ZM11.07 3.5c.55-.67.92-1.6.82-2.53-.79.03-1.75.53-2.32 1.19-.51.59-.96 1.54-.84 2.44.88.07 1.79-.45 2.34-1.1Z" />
    </svg>
  );
}
