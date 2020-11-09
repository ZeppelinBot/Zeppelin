import express, { Request, Response } from "express";
import { apiTokenAuthHandlers } from "./auth";
import { isStaff } from "../staff";

export function initStaff(app: express.Express) {
  const staffRouter = express.Router();
  staffRouter.use(...apiTokenAuthHandlers());

  staffRouter.get("/status", (req: Request, res: Response) => {
    const userIsStaff = isStaff(req.user!.userId);
    res.json({ isStaff: userIsStaff });
  });

  app.use("/staff", staffRouter);
}
