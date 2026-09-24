import { Router } from "express";
import { UserRole } from "@admin-coordinator/shared";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import * as controller from "../controllers/curriculumRules.controller";

const router = Router();

router.use(requireAuth, requireRole(UserRole.ADMIN));

router.get("/", controller.getCurriculumCategoryRules);
router.post("/", controller.postCurriculumCategoryRule);
router.delete("/:id", controller.deleteCurriculumCategoryRuleHandler);

export default router;
