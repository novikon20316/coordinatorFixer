"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { he } from "@admin-coordinator/shared";
import { auth, isFirebaseConfigured } from "../../lib/firebase";

type CodeState = "checking" | "valid" | "invalid";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode") ?? "";

  const [codeState, setCodeState] = useState<CodeState>("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!auth || !oobCode) {
      setCodeState("invalid");
      return;
    }
    verifyPasswordResetCode(auth, oobCode)
      .then((resolvedEmail) => {
        setEmail(resolvedEmail);
        setCodeState("valid");
      })
      .catch(() => setCodeState("invalid"));
  }, [oobCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(he.auth.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(he.auth.passwordMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth!, oobCode, password);
      setDone(true);
    } catch {
      setError(he.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isFirebaseConfigured) {
    return <p className="text-center text-sm text-amber-700">Firebase טרם חובר</p>;
  }

  if (codeState === "checking") {
    return <p className="text-center text-sm text-gray-500">{he.common.loading}</p>;
  }

  if (codeState === "invalid") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">
          {he.auth.invalidOrExpiredLink}
        </p>
        <Link href="/forgot-password" className="text-sm text-blue-700 hover:underline">
          {he.auth.requestNewLink}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="rounded-md bg-green-50 px-3 py-3 text-sm text-green-800">
          {he.auth.resetSuccess}
        </p>
        <Link href="/login" className="text-sm text-blue-700 hover:underline">
          {he.auth.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {email && <p className="text-center text-sm text-gray-500">{email}</p>}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">{he.auth.newPassword}</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-700">{he.auth.confirmNewPassword}</span>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-blue-700 py-2 font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
      >
        {submitting ? he.common.loading : he.auth.submitNewPassword}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          {he.auth.resetPasswordTitle}
        </h1>
        <Suspense fallback={<p className="text-center text-sm text-gray-500">{he.common.loading}</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
