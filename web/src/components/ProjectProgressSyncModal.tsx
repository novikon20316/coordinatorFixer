"use client";

import { useEffect, useState } from "react";
import { he, Student } from "@admin-coordinator/shared";
import { apiFetch } from "../lib/apiClient";
import { buildProjectProgressPreview, OrgSystemProgress, ProjectProgressPreview } from "../lib/import/projectProgressSync";

/** Fetches this student's project milestones/grades from
 *  organization-all-system (matched by idNumber/ת.ז) and previews the
 *  changes before saving - same fetch/preview/confirm shape as
 *  AcademicBalanceImportModal, except the source is a live API call (made
 *  server-side, which holds the shared secret) instead of an uploaded file. */
export function ProjectProgressSyncModal({
  student,
  onClose,
  onDone,
}: {
  student: Student;
  onClose: () => void;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<ProjectProgressPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data: OrgSystemProgress = await apiFetch(`/api/students/${student.id}/org-system-progress`);
        if (cancelled) return;
        if (!data.found) {
          setError(he.projectProgressSync.notFound.replace("{idNumber}", student.idNumber));
          return;
        }
        if (!data.project) {
          setError(he.projectProgressSync.noProject);
          return;
        }
        setPreview(buildProjectProgressPreview(data, student.milestones ?? []));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : he.common.error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (!student.idNumber) {
      setError(he.projectProgressSync.noIdNumber);
      setLoading(false);
    } else {
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [student.id, student.idNumber, student.milestones]);

  async function handleConfirm() {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/students/${student.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          milestones: preview.milestones,
          externalId: preview.uid,
          ...(preview.projectTitle ? { projectTitle: preview.projectTitle } : {}),
          ...(preview.supervisorName ? { supervisorName: preview.supervisorName } : {}),
        }),
      });
      setDone(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : he.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">{he.projectProgressSync.title}</h2>
        <p className="text-xs text-gray-500">{he.projectProgressSync.description}</p>

        {loading && <p className="text-sm text-gray-600">{he.projectProgressSync.loading}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {preview && !done && (
          <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 text-sm">
            <p className="font-semibold text-gray-900">{student.fullName}</p>
            {preview.projectTitle && (
              <p className="text-xs text-gray-600">
                {he.projectProgressSync.willUpdateProjectTitle.replace("{title}", preview.projectTitle)}
              </p>
            )}
            {preview.supervisorName && (
              <p className="text-xs text-gray-600">
                {he.projectProgressSync.willUpdateSupervisor.replace("{name}", preview.supervisorName)}
              </p>
            )}
            <p className="text-xs text-gray-600">
              {he.projectProgressSync.changedCount.replace("{count}", String(preview.changedCount))}
            </p>
            {preview.changedCount === 0 && <p className="text-xs text-amber-700">{he.projectProgressSync.noChanges}</p>}
          </div>
        )}

        {done && (
          <p className="rounded-md bg-green-50 p-3 text-sm font-medium text-green-800">
            {he.projectProgressSync.success}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            {done ? he.studentDetail.close : he.importReview.cancel}
          </button>
          {preview && !done && (
            <button
              onClick={handleConfirm}
              disabled={saving || preview.changedCount === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? he.importReview.confirming : he.importReview.confirm}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
