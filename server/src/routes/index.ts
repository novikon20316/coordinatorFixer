import { Router } from "express";
import studentsRouter from "./students";
import usersRouter from "./users";
import candidatesRouter from "./candidates";
import curriculumRulesRouter from "./curriculumRules";

const router = Router();

router.use("/students", studentsRouter);
router.use("/users", usersRouter);
router.use("/candidates", candidatesRouter);
router.use("/curriculum-category-rules", curriculumRulesRouter);

export default router;
