"use client";

import { useEffect, useState } from "react";
import { AppUser, FACULTY_VALUES, generateReadableTempPassword, he, UserRole } from "@admin-coordinator/shared";
import { useAuth } from "../../../context/AuthContext";
import { apiFetch } from "../../../lib/apiClient";

export default function CoordinatorsPage() {
  const { profile } = useAuth();
  const [coordinators, setCoordinators] = useState<AppUser[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const isAdmin = profile?.role === UserRole.ADMIN;

  async function reload() {
    setLoadingList(true);
    setListError(null);
    try {
      const users = (await apiFetch("/api/users")) as AppUser[];
      setCoordinators(users.filter((u) => u.role === UserRole.COORDINATOR));
    } catch (err) {
      setListError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (isAdmin) reload();
  }, [isAdmin]);

  async function toggleActive(uid: string, isActive: boolean) {
    await apiFetch(`/api/users/${uid}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    });
    reload();
  }

  if (!profile) {
    return <p className="text-gray-500">{he.common.loading}</p>;
  }
  if (!isAdmin) {
    return <p className="text-red-600">{he.coordinators.accessDenied}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-gray-900">{he.coordinators.title}</h1>

      <NewCoordinatorForm onCreated={reload} />

      <section className="flex flex-col gap-3">
        {listError && <p className="text-sm text-red-600">{listError}</p>}
        {loadingList ? (
          <p className="text-sm text-gray-500">{he.common.loading}</p>
        ) : coordinators.length === 0 ? (
          <p className="text-sm text-gray-500">{he.coordinators.noCoordinators}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[700px] text-right text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">{he.coordinators.fullName}</th>
                  <th className="px-4 py-3 font-semibold">{he.coordinators.email}</th>
                  <th className="px-4 py-3 font-semibold">{he.coordinators.faculty}</th>
                  <th className="px-4 py-3 font-semibold">{he.table.columns.status}</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coordinators.map((c) => (
                  <tr key={c.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.displayName}</td>
                    <td className="px-4 py-3 text-gray-700">{c.email}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.facultyId ? he.faculty[c.facultyId] : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          c.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {c.isActive ? he.coordinators.active : he.coordinators.disabled}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(c.uid, c.isActive)}
                        className="text-sm font-medium text-blue-700 hover:underline"
                      >
                        {c.isActive ? he.coordinators.disable : he.coordinators.enable}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function NewCoordinatorForm({ onCreated }: { onCreated: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleGeneratePassword() {
    setPassword(generateReadableTempPassword());
    setShowPassword(true);
    setCopied(false);
  }

  async function handleCopyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied - password is still visible to copy manually
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ displayName, email, password, facultyId }),
      });
      setSuccess(true);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setFacultyId("");
      setShowPassword(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5"
    >
      <h2 className="font-semibold text-gray-900">{he.coordinators.addNew}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">{he.coordinators.fullName}</span>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">{he.coordinators.email}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">{he.coordinators.tempPassword}</span>
          <div className="flex gap-2">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {he.coordinators.generatePassword}
            </button>
            {password && (
              <button
                type="button"
                onClick={handleCopyPassword}
                className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {copied ? he.coordinators.copied : he.coordinators.copyPassword}
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500">{he.coordinators.tempPasswordHint}</span>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">{he.coordinators.faculty}</span>
          <select
            required
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            className={inputClass}
          >
            <option value="">{he.coordinators.selectFaculty}</option>
            {FACULTY_VALUES.map((f) => (
              <option key={f} value={f}>
                {he.faculty[f]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{he.coordinators.createSuccess}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-md bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
      >
        {submitting ? he.common.loading : he.coordinators.create}
      </button>
    </form>
  );
}
