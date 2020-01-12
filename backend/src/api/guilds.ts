import express, { Request, Response } from "express";
import { AllowedGuilds } from "../data/AllowedGuilds";
import { clientError, ok, serverError, unauthorized } from "./responses";
import { Configs } from "../data/Configs";
import { validateGuildConfig } from "../configValidator";
import yaml, { YAMLException } from "js-yaml";
import { apiTokenAuthHandlers } from "./auth";
import { ApiPermissions, hasPermission, permissionArrToSet } from "@shared/apiPermissions";
import { ApiPermissionAssignments } from "../data/ApiPermissionAssignments";

export function initGuildsAPI(app: express.Express) {
  const allowedGuilds = new AllowedGuilds();
  const apiPermissionAssignments = new ApiPermissionAssignments();
  const configs = new Configs();

  app.get("/guilds/available", ...apiTokenAuthHandlers(), async (req: Request, res: Response) => {
    const guilds = await allowedGuilds.getForApiUser(req.user.userId);
    res.json(guilds);
  });

  app.get("/guilds/:guildId/config", ...apiTokenAuthHandlers(), async (req: Request, res: Response) => {
    const permAssignment = await apiPermissionAssignments.getByGuildAndUserId(req.params.guildId, req.user.userId);
    if (!permAssignment || !hasPermission(permissionArrToSet(permAssignment.permissions), ApiPermissions.ReadConfig)) {
      return unauthorized(res);
    }

    const config = await configs.getActiveByKey(`guild-${req.params.guildId}`);
    res.json({ config: config ? config.config : "" });
  });

  app.post("/guilds/:guildId/config", ...apiTokenAuthHandlers(), async (req, res) => {
    const permAssignment = await apiPermissionAssignments.getByGuildAndUserId(req.params.guildId, req.user.userId);
    if (!permAssignment || !hasPermission(permissionArrToSet(permAssignment.permissions), ApiPermissions.EditConfig)) {
      return unauthorized(res);
    }

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

      // tslint:disable-next-line:no-console
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
