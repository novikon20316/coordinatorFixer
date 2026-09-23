"use client";

import { useMemo } from "react";
import { he, isActiveCourseworkFullyDone, Student } from "@admin-coordinator/shared";
import { useOneShotAttentionAlerts } from "./useOneShotAttentionAlerts";

const STORAGE_KEY = "activeGraduationAttentionNotifiedIds";

/** ACTIVE-status students who now have every course-completion category
 *  cleared and no נ"ז shortfall left - see isActiveCourseworkFullyDone. */
export function useActiveGraduationAttentionAlerts(students: Student[]) {
  const pending = useMemo(
    () =>
      students
        .filter((s) => isActiveCourseworkFullyDone(s))
        .map((s) => ({
          studentId: s.id,
          message: he.dashboard.activeReadyAttentionMessage.replace("{name}", s.fullName),
          accent: "purple" as const,
        })),
    [students]
  );

  return useOneShotAttentionAlerts(STORAGE_KEY, pending);
}
