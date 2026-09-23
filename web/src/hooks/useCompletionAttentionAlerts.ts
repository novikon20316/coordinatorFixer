"use client";

import { useMemo } from "react";
import { Candidate, he, Student, StudentTrack } from "@admin-coordinator/shared";
import { isCompletionGradingDone } from "../lib/completionCourses";
import { useOneShotAttentionAlerts } from "./useOneShotAttentionAlerts";

const STORAGE_KEY = "completionAttentionNotifiedIds";

/** בהשלמה students who now have a grade for every required קורס השלמה - see
 *  isCompletionGradingDone. */
export function useCompletionAttentionAlerts(students: Student[], candidates: Candidate[]) {
  const pending = useMemo(
    () =>
      students
        .filter((s) => s.track === StudentTrack.COMPLETION && isCompletionGradingDone(s, candidates))
        .map((s) => ({
          studentId: s.id,
          message: he.dashboard.completionAttentionMessage.replace("{name}", s.fullName),
          accent: "amber" as const,
        })),
    [students, candidates]
  );

  return useOneShotAttentionAlerts(STORAGE_KEY, pending);
}
