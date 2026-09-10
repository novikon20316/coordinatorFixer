import { Candidate, CandidateStatus, Faculty } from "@admin-coordinator/shared";

export const mockCandidates: Candidate[] = [
  {
    id: "c1",
    fullName: "רון ברק",
    faculty: Faculty.DATA_SCIENCE,
    applyingForYear: "תשפז",
    previousCollege: "אוניברסיטת חיפה",
    degreeField: "מדעי המחשב",
    gpa: 91,
    background: "מהנדס תוכנה, 4 שנות ניסיון",
    acceptanceDecision: "REGULAR",
    committeeNotes: "רקע חזק, ללא צורך בהשלמות",
    status: CandidateStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
