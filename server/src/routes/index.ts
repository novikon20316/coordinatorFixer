import { Router } from "express";
import studentsRouter from "./students";
import usersRouter from "./users";

const router = Router();

router.use("/students", studentsRouter);
router.use("/users", usersRouter);

export default router;
