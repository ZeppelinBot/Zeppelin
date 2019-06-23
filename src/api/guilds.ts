import express from "express";
import passport from "passport";
import { AllowedGuilds } from "../data/AllowedGuilds";
import { requireAPIToken } from "./auth";
import { DashboardUsers } from "../data/DashboardUsers";
import { clientError, ok, unauthorized } from "./responses";
import { Configs } from "../data/Configs";
import { DashboardRoles } from "../data/DashboardRoles";

export function initGuildsAPI(app: express.Express) {
  const guildAPIRouter = express.Router();
  requireAPIToken(guildAPIRouter);

  const allowedGuilds = new AllowedGuilds();
  const dashboardUsers = new DashboardUsers();
  const configs = new Configs();

  guildAPIRouter.get("/guilds/available", async (req, res) => {
    const guilds = await allowedGuilds.getForDashboardUser(req.user.userId);
    res.json(guilds);
  });

  guildAPIRouter.get("/guilds/:guildId/config", async (req, res) => {
    const dbUser = await dashboardUsers.getByGuildAndUserId(req.params.guildId, req.user.userId);
    if (!dbUser) return unauthorized(res);

    const config = await configs.getActiveByKey(`guild-${req.params.guildId}`);
    res.json({ config: config ? config.config : "" });
  });

  guildAPIRouter.post("/guilds/:guildId/config", async (req, res) => {
    const dbUser = await dashboardUsers.getByGuildAndUserId(req.params.guildId, req.user.userId);
    if (!dbUser || DashboardRoles[dbUser.role] < DashboardRoles.Editor) return unauthorized(res);

    const config = req.body.config;
    if (config == null) return clientError(res, "No config supplied");

    await configs.saveNewRevision(`guild-${req.params.guildId}`, config, req.user.userId);
    ok(res);
  });

  app.use(guildAPIRouter);
}
