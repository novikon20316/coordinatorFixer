import { Request, Response, NextFunction } from "express";
import {
  CandidateStatus,
  DegreeType,
  Faculty,
  HebrewYear,
  StudentStatus,
  StudentTrack,
} from "@admin-coordinator/shared";
import * as candidatesService from "../services/candidates.service";
import * as studentsService from "../services/students.service";

export async function getCandidates(req: Request, res: Response, next: NextFunction) {
  try {
    const { faculty, applyingForYear, status } = req.query;
    const candidates = await candidatesService.listCandidates({
      faculty: faculty as Faculty | undefined,
      applyingForYear: applyingForYear as HebrewYear | undefined,
      status: status as CandidateStatus | undefined,
    });
    res.json(candidates);
  } catch (err) {
    next(err);
  }
}

export async function getCandidateById(req: Request, res: Response, next: NextFunction) {
  try {
    const candidate = await candidatesService.getCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json(candidate);
  } catch (err) {
    next(err);
  }
}

export async function postCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const candidate = await candidatesService.createCandidate(req.body);
    res.status(201).json(candidate);
  } catch (err) {
    next(err);
  }
}

export async function patchCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const candidate = await candidatesService.updateCandidate(req.params.id, req.body);
    res.json(candidate);
  } catch (err) {
    next(err);
  }
}

export async function removeCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    await candidatesService.deleteCandidate(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * Turns an accepted candidate into an enrolled Student - the real-world
 * admissions-to-enrollment transition. Copies the fields that carry across
 * (previousCollege/degreeField/gpa/background/idNumber), sets the new
 * student's cohortYear to the year the candidate applied for, and derives
 * track from the committee's acceptance decision: a REGULAR decision starts
 * the student on the regular track, anything else (CONDITIONAL/NOT_REGULAR -
 * both mean the student owes completion coursework) starts them on
 * StudentTrack.COMPLETION, matching how the department's own historical
 * files label these students ("בוגרים משלימים").
 */
export async function promoteCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const candidate = await candidatesService.getCandidate(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    if (candidate.promotedStudentId) {
      return res.status(400).json({ error: "Candidate has already been promoted" });
    }

    const track = candidate.acceptanceDecision === "REGULAR" ? StudentTrack.REGULAR : StudentTrack.COMPLETION;

    const student = await studentsService.createStudent({
      fullName: candidate.fullName,
      idNumber: candidate.idNumber ?? "",
      faculty: candidate.faculty,
      track,
      status: StudentStatus.ACTIVE,
      cohortYear: candidate.applyingForYear,
      previousCollege: candidate.previousCollege,
      degreeField: candidate.degreeField,
      // Candidate has no equivalent of Student.degreeType (BA/BSc) - left for
      // a coordinator to correct by hand, same precedent as the
      // organization-all-system import mapper (see types/import.ts).
      degreeType: DegreeType.OTHER,
      gpa: candidate.gpa,
      background: candidate.background,
      candidateId: candidate.id,
      source: candidate.source,
    });

    const updatedCandidate = await candidatesService.updateCandidate(candidate.id, {
      status: CandidateStatus.ACCEPTED,
      promotedStudentId: student.id,
    });

    res.status(201).json({ student, candidate: updatedCandidate });
  } catch (err) {
    next(err);
  }
}
