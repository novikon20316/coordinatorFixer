"use client";

import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "wheel"] as const;

/**
 * Flips to true once no user activity (mouse, keyboard, touch, scroll) has
 * been seen for `timeoutMs` - used to force a re-login after a stretch of
 * inactivity instead of leaving a signed-in session open indefinitely on a
 * shared/unattended machine. Once idle, further activity does NOT clear the
 * flag on its own - only the caller's own confirm action (see
 * IdleTimeoutModal) should do that, by unmounting/remounting this hook.
 * `enabled` lets the caller scope this to only the authenticated app shell.
 */
export function useIdleTimeout(timeoutMs: number, enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);
  const idleRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      idleRef.current = false;
      setIdle(false);
      return;
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        idleRef.current = true;
        setIdle(true);
      }, timeoutMs);
    }

    function handleActivity() {
      if (idleRef.current) return;
      resetTimer();
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, handleActivity, { passive: true });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handleActivity);
    };
  }, [timeoutMs, enabled]);

  return idle;
}
