import { Router } from "express";
import studentsRouter from "./students";
import usersRouter from "./users";
import candidatesRouter from "./candidates";

const router = Router();

router.use("/students", studentsRouter);
router.use("/users", usersRouter);
router.use("/candidates", candidatesRouter);

export default router;
