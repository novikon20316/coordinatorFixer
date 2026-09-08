"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { he } from "@admin-coordinator/shared";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      </div>
    </div>
  );
}
