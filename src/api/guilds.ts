import express from "express";
import passport from "passport";
import { AllowedGuilds } from "../data/AllowedGuilds";

export function initGuildsAPI(app: express.Express) {
  const guildAPIRouter = express.Router();
  guildAPIRouter.use(passport.authenticate("api-token"));

  const allowedGuilds = new AllowedGuilds();

  guildAPIRouter.get("/guilds/available", async (req, res) => {
    const guilds = await allowedGuilds.getForDashboardUser(req.user.userId);
    res.end(guilds);
  });
}
