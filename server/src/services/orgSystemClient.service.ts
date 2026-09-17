// Calls organization-all-system's own integration endpoint (see that repo's
// server/src/controllers/integrationController.ts) to pull a student's
// project milestones/grades. Server-to-server only - the shared secret this
// sends must never reach the browser, which is why this lives in the server
// package and not web/src/lib.

export interface OrgSystemGradeEntry {
  graderRole: string | null;
  total: number | null;
  comments: string;
  isFinalized: boolean;
  submittedAt: string | null;
}

export interface OrgSystemMilestone {
  id: string;
  type: string | null;
  status: string | null;
  dueDate: string | null;
  finalGrade: number | null;
  gradeApproved: boolean;
  gradeApprovedAt: string | null;
  grades: OrgSystemGradeEntry[];
}

export interface OrgSystemProject {
  titleHe: string;
  titleEn: string;
  supervisorName: string | null;
}

export type OrgSystemProgress =
  | { found: false }
  | { found: true; uid: string; project: OrgSystemProject | null; milestones: OrgSystemMilestone[] };

export async function fetchOrgSystemProgress(idNumber: string): Promise<OrgSystemProgress> {
  const baseUrl = process.env.ORG_SYSTEM_BASE_URL;
  const key = process.env.ORG_SYSTEM_INTEGRATION_KEY;
  if (!baseUrl || !key) {
    throw new Error("organization-all-system integration is not configured (ORG_SYSTEM_BASE_URL/ORG_SYSTEM_INTEGRATION_KEY)");
  }

  const res = await fetch(`${baseUrl}/api/integrations/student-progress/${encodeURIComponent(idNumber)}`, {
    headers: { "x-integration-key": key },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `organization-all-system request failed (${res.status})`);
  }
  return res.json() as Promise<OrgSystemProgress>;
}
