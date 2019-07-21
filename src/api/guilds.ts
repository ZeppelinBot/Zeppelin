import express from "express";
import passport from "passport";
import { AllowedGuilds } from "../data/AllowedGuilds";
import { ApiPermissions } from "../data/ApiPermissions";
import { clientError, error, ok, serverError, unauthorized } from "./responses";
import { Configs } from "../data/Configs";
import { ApiRoles } from "../data/ApiRoles";
import { validateGuildConfig } from "../configValidator";
import yaml, { YAMLException } from "js-yaml";
import { apiTokenAuthHandlers } from "./auth";

export function initGuildsAPI(app: express.Express) {
  const allowedGuilds = new AllowedGuilds();
  const apiPermissions = new ApiPermissions();
  const configs = new Configs();

  app.get("/guilds/available", ...apiTokenAuthHandlers(), async (req, res) => {
    const guilds = await allowedGuilds.getForApiUser(req.user.userId);
    res.json(guilds);
  });

  app.get("/guilds/:guildId/config", ...apiTokenAuthHandlers(), async (req, res) => {
    const permissions = await apiPermissions.getByGuildAndUserId(req.params.guildId, req.user.userId);
    if (!permissions) return unauthorized(res);

    const config = await configs.getActiveByKey(`guild-${req.params.guildId}`);
    res.json({ config: config ? config.config : "" });
  });

  app.post("/guilds/:guildId/config", ...apiTokenAuthHandlers(), async (req, res) => {
    const permissions = await apiPermissions.getByGuildAndUserId(req.params.guildId, req.user.userId);
    if (!permissions || ApiRoles[permissions.role] < ApiRoles.Editor) return unauthorized(res);

    let config = req.body.config;
    if (config == null) return clientError(res, "No config supplied");

    config = config.trim() + "\n"; // Normalize start/end whitespace in the config

    const currentConfig = await configs.getActiveByKey(`guild-${req.params.guildId}`);
    if (config === currentConfig.config) {
      return ok(res);
    }

    // Validate config
    let parsedConfig;
    try {
      parsedConfig = yaml.safeLoad(config);
    } catch (e) {
      if (e instanceof YAMLException) {
        return res.status(400).json({ errors: [e.message] });
      }

      console.error("Error when loading YAML: " + e.message);
      return serverError(res, "Server error");
    }

    if (parsedConfig == null) {
      parsedConfig = {};
    }

    const errors = validateGuildConfig(parsedConfig);
    if (errors) {
      return res.status(422).json({ errors });
    }

    await configs.saveNewRevision(`guild-${req.params.guildId}`, config, req.user.userId);
    ok(res);
  });
}
