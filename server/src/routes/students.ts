import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as controller from "../controllers/students.controller";

const router = Router();

router.use(requireAuth);

router.get("/", controller.getStudents);
router.post("/import", controller.importStudents);
router.get("/:id", controller.getStudentById);
router.post("/", controller.postStudent);
router.patch("/:id", controller.patchStudent);
router.delete("/:id", controller.removeStudent);

export default router;
