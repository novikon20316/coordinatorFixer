import { Request, Response, NextFunction } from "express";
import { CourseCategoryKey, Faculty, HEBREW_YEAR_VALUES } from "@admin-coordinator/shared";
import * as service from "../services/curriculumRules.service";

const VALID_CATEGORIES: CourseCategoryKey[] = ["core_curriculum", "core", "elective"];

export async function getCurriculumCategoryRules(req: Request, res: Response, next: NextFunction) {
  try {
    const { faculty } = req.query;
    const rules = await service.listCurriculumCategoryRules(faculty as Faculty | undefined);
    res.json(rules);
  } catch (err) {
    next(err);
  }
}

/** Admin-only: records that a course moves from one graduation category to
 *  another starting a given מחזור - see CurriculumCategoryRule. Rejects a
 *  move into core_curriculum and a same-category "move", the two cases the
 *  frontend's own form never offers but a direct API call could still send. */
export async function postCurriculumCategoryRule(req: Request, res: Response, next: NextFunction) {
  try {
    const { faculty, course, fromCategory, toCategory, effectiveFromCohort } = req.body ?? {};
    if (!faculty || !course || !fromCategory || !toCategory || !effectiveFromCohort) {
      return res
        .status(400)
        .json({ error: "faculty, course, fromCategory, toCategory and effectiveFromCohort are required" });
    }
    if (!VALID_CATEGORIES.includes(fromCategory) || !VALID_CATEGORIES.includes(toCategory)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    if (fromCategory === toCategory) {
      return res.status(400).json({ error: "fromCategory and toCategory must differ" });
    }
    if (toCategory === "core_curriculum") {
      return res.status(400).json({ error: "Moving a course into core_curriculum is not supported" });
    }
    if (!HEBREW_YEAR_VALUES.includes(effectiveFromCohort)) {
      return res.status(400).json({ error: "Invalid effectiveFromCohort" });
    }

    const rule = await service.createCurriculumCategoryRule({
      faculty,
      course,
      fromCategory,
      toCategory,
      effectiveFromCohort,
    });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

export async function deleteCurriculumCategoryRuleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteCurriculumCategoryRule(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
