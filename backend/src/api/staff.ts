import express, { Request, Response } from "express";
import { isStaff } from "../staff";
import { apiTokenAuthHandlers } from "./auth";

export function initStaff(app: express.Express) {
  const staffRouter = express.Router();
  staffRouter.use(...apiTokenAuthHandlers());

  staffRouter.get("/status", (req: Request, res: Response) => {
    const userIsStaff = isStaff(req.user!.userId);
    res.json({ isStaff: userIsStaff });
  });

  app.use("/staff", staffRouter);
}
