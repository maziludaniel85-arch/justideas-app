import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companiesRouter from "./companies";
import shareholdersRouter from "./shareholders";
import directorsRouter from "./directors";
import documentsRouter from "./documents";
import registrationsRouter from "./registrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(companiesRouter);
router.use("/companies/:id/shareholders", shareholdersRouter);
router.use("/companies/:id/directors", directorsRouter);
router.use("/companies/:id/documents", documentsRouter);
router.use(registrationsRouter);

export default router;
