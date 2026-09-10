import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as controller from "../controllers/candidates.controller";

const router = Router();

router.use(requireAuth);

router.get("/", controller.getCandidates);
router.get("/:id", controller.getCandidateById);
router.post("/", controller.postCandidate);
router.patch("/:id", controller.patchCandidate);
router.delete("/:id", controller.removeCandidate);
router.post("/:id/promote", controller.promoteCandidate);

export default router;
