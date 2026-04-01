import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dosareRouter from "./dosare";
import asociatiDosarRouter from "./asociati-dosar";
import codurICaenRouter from "./coduri-caen";
import platiRouter from "./plati";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dosareRouter);
router.use("/dosare/:id/asociati", asociatiDosarRouter);
router.use(codurICaenRouter);
router.use(platiRouter);

export default router;
