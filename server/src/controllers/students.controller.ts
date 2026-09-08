import { Request, Response, NextFunction } from "express";
import { Faculty, StudentTrack, StudentStatus, DegreeType } from "@admin-coordinator/shared";
import * as studentsService from "../services/students.service";

export async function getStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const { faculty, track, status, degreeType, previousCollege, degreeField, minGpa, maxGpa } = req.query;
    const students = await studentsService.listStudents({
      faculty: faculty as Faculty | undefined,
      track: track as StudentTrack | undefined,
      status: status as StudentStatus | undefined,
      degreeType: degreeType as DegreeType | undefined,
      previousCollege: previousCollege as string | undefined,
      degreeField: degreeField as string | undefined,
      minGpa: minGpa ? Number(minGpa) : undefined,
      maxGpa: maxGpa ? Number(maxGpa) : undefined,
    });
    res.json(students);
  } catch (err) {
    next(err);
  }
}

export async function getStudentById(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentsService.getStudent(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    next(err);
  }
}

export async function postStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentsService.createStudent(req.body);
    res.status(201).json(student);
  } catch (err) {
    next(err);
  }
}

export async function patchStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentsService.updateStudent(req.params.id, req.body);
    res.json(student);
  } catch (err) {
    next(err);
  }
}

export async function removeStudent(req: Request, res: Response, next: NextFunction) {
  try {
    await studentsService.deleteStudent(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
