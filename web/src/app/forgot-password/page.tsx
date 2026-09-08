"use client";

import { useState } from "react";
import Link from "next/link";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPasswordPage() {
  const { sendResetEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendResetEmail(email);
      setSent(true);
    } catch {
      setError(he.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          {he.auth.forgotPasswordTitle}
        </h1>

        {sent ? (
          <p className="rounded-md bg-green-50 px-3 py-3 text-center text-sm text-green-800">
            {he.auth.resetLinkSent}
          </p>
        ) : (
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-md bg-blue-700 py-2 font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting ? he.common.loading : he.auth.sendResetLink}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-4 block text-center text-sm text-blue-700 hover:underline">
          {he.auth.backToLogin}
        </Link>
      </div>
    </div>
  );
}
