import { Router } from "express";
import { UserRole } from "@admin-coordinator/shared";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import * as controller from "../controllers/users.controller";

const router = Router();

router.use(requireAuth, requireRole(UserRole.ADMIN));

router.get("/", controller.listUsers);
router.post("/", controller.createUser);
router.patch("/:uid/role", controller.updateUserRole);
router.patch("/:uid/active", controller.updateUserActive);

export default router;
