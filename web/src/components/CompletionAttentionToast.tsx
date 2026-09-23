"use client";

import { useEffect } from "react";
import { he } from "@admin-coordinator/shared";
import { AttentionAlertItem } from "../hooks/useOneShotAttentionAlerts";

const AUTO_DISMISS_MS = 10_000;

const ACCENT_STYLES: Record<AttentionAlertItem["accent"], { box: string; dot: string; text: string; close: string }> = {
  amber: {
    box: "border-amber-300 bg-amber-50",
    dot: "bg-red-500",
    text: "text-amber-900",
    close: "text-amber-500 hover:text-amber-700",
  },
  purple: {
    box: "border-purple-300 bg-purple-50",
    dot: "bg-purple-500",
    text: "text-purple-900",
    close: "text-purple-500 hover:text-purple-700",
  },
};

export function CompletionAttentionToast({
  toasts,
  onDismiss,
}: {
  toasts: AttentionAlertItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} accent={t.accent} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  id,
  message,
  accent,
  onDismiss,
}: {
  id: string;
  message: string;
  accent: AttentionAlertItem["accent"];
  onDismiss: (id: string) => void;
}) {
  const styles = ACCENT_STYLES[accent];

  // Timer starts the moment this toast actually renders, i.e. while the
  // coordinator is on the overview page - a toast queued while she was
  // elsewhere still only starts counting down once it's shown here.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div role="status" className={`flex items-start gap-2 rounded-lg border px-4 py-3 shadow-lg ${styles.box}`}>
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
      <p className={`flex-1 text-sm ${styles.text}`}>{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label={he.dashboard.dismissNotification}
        className={`shrink-0 ${styles.close}`}
      >
        ×
      </button>
    </div>
  );
}
