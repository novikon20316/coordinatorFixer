import { MilestoneProgress } from "@admin-coordinator/shared";

export interface OrgSystemMilestone {
  id: string;
  type: string | null;
  status: string | null;
  dueDate: string | null;
  finalGrade: number | null;
  gradeApproved: boolean;
}

export interface OrgSystemProject {
  titleHe: string;
  titleEn: string;
  supervisorName: string | null;
}

export type OrgSystemProgress =
  | { found: false }
  | { found: true; uid: string; project: OrgSystemProject | null; milestones: OrgSystemMilestone[] };

export interface ProjectProgressPreview {
  uid: string;
  projectTitle?: string;
  supervisorName?: string;
  milestones: MilestoneProgress[];
  changedCount: number;
}

// Mirrors organization-all-system's studentProgress.ts's DONE_STATUSES - kept
// as a separate copy here (not imported, the two repos share no package)
// since this is the one status distinction this system actually needs to
// know: whether to check the milestone off.
const DONE_STATUSES = new Set(["coordinator_approved", "completed"]);

/**
 * Merges organization-all-system's milestones into this student's existing
 * checklist: a milestone whose `key` already matches the source `type` gets
 * its grade/dueDate/status/done filled in; anything unmatched is appended as
 * a new entry (key = source type) rather than dropped, since a coordinator
 * can always delete/rename an entry that doesn't fit but can't recover data
 * silently discarded here.
 */
export function buildProjectProgressPreview(
  source: Extract<OrgSystemProgress, { found: true }>,
  current: MilestoneProgress[]
): ProjectProgressPreview {
  const next = current.map((m) => ({ ...m }));
  let changedCount = 0;

  for (const sm of source.milestones) {
    if (!sm.type) continue;
    const done = sm.status != null && DONE_STATUSES.has(sm.status);
    const patch: Omit<Partial<MilestoneProgress>, "done"> & { done: boolean } = {
      done,
      grade: sm.finalGrade ?? undefined,
      dueDate: sm.dueDate ?? undefined,
      externalStatus: sm.status ?? undefined,
    };

    const idx = next.findIndex((m) => m.key === sm.type);
    if (idx >= 0) {
      const merged = { ...next[idx], ...patch };
      if (JSON.stringify(merged) !== JSON.stringify(next[idx])) changedCount++;
      next[idx] = merged;
    } else {
      next.push({ key: sm.type, nameHe: sm.type, nameEn: sm.type, ...patch });
      changedCount++;
    }
  }

  return {
    uid: source.uid,
    projectTitle: source.project?.titleHe || source.project?.titleEn || undefined,
    supervisorName: source.project?.supervisorName ?? undefined,
    milestones: next,
    changedCount,
  };
}
