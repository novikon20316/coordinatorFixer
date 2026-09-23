"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface AttentionAlertItem {
  id: string;
  studentId: string;
  message: string;
  /** Visual accent for the toast/badge - lets two unrelated attention types
   *  (e.g. בהשלמה grades-in vs. an active student ready for review) read as
   *  distinct at a glance even while stacked together. */
  accent: "amber" | "purple";
}

function loadNotifiedIds(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(storageKey: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...ids]));
  } catch {
    // Best-effort only - a private window or blocked storage just means a
    // student may be re-announced next visit, which is harmless.
  }
}

/**
 * Generic "a student just started needing attention" tracker. `pendingCount`
 * is the live, persistent signal (drives a tab dot / card badge - stays true
 * until whatever made a student pending stops being true), while `toasts` is
 * a one-shot announcement queue for a student's *first* detected transition
 * into that state, so re-rendering or navigating back to the page doesn't
 * keep re-announcing the same student. The "already announced" set is kept
 * in localStorage (per browser, not per student record - this app has no
 * server-side notification store), keyed by `storageKey` so unrelated
 * attention types don't interfere with each other's memory, and a student is
 * dropped from it again once they stop being pending, so a later recurrence
 * re-announces. See useCompletionAttentionAlerts /
 * useActiveGraduationAttentionAlerts for the concrete detection rules.
 */
export function useOneShotAttentionAlerts(
  storageKey: string,
  pending: { studentId: string; message: string; accent: "amber" | "purple" }[]
) {
  const [toasts, setToasts] = useState<AttentionAlertItem[]>([]);
  const notifiedRef = useRef<Set<string> | null>(null);
  if (notifiedRef.current === null) notifiedRef.current = loadNotifiedIds(storageKey);

  const pendingIds = useMemo(() => new Set(pending.map((p) => p.studentId)), [pending]);

  useEffect(() => {
    const notified = notifiedRef.current!;
    let changed = false;

    for (const id of [...notified]) {
      if (!pendingIds.has(id)) {
        notified.delete(id);
        changed = true;
      }
    }

    const newlyPending = pending.filter((p) => !notified.has(p.studentId));
    if (newlyPending.length > 0) {
      for (const p of newlyPending) notified.add(p.studentId);
      changed = true;
      setToasts((prev) => [
        ...prev,
        ...newlyPending.map((p) => ({
          id: `${p.studentId}-${Date.now()}`,
          studentId: p.studentId,
          message: p.message,
          accent: p.accent,
        })),
      ]);
    }

    if (changed) saveNotifiedIds(storageKey, notified);
    // pending is a derived array (new identity every render its members
    // change), so it's compared by pendingIds instead to avoid an effect
    // loop; pending itself is read fresh inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds]);

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { pendingCount: pendingIds.size, toasts, dismissToast };
}
