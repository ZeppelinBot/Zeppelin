import express, { Request, Response } from "express";
import { AllowedGuilds } from "../data/AllowedGuilds";
import { clientError, ok, serverError, unauthorized } from "./responses";
import { Configs } from "../data/Configs";
import { validateGuildConfig } from "../configValidator";
import yaml, { YAMLException } from "js-yaml";
import { apiTokenAuthHandlers } from "./auth";
import { ApiPermissions } from "@shared/apiPermissions";
import { hasGuildPermission, requireGuildPermission } from "./permissions";
import { ApiPermissionAssignments } from "../data/ApiPermissionAssignments";

const apiPermissionAssignments = new ApiPermissionAssignments();

export function initGuildsAPI(app: express.Express) {
  const allowedGuilds = new AllowedGuilds();
  const configs = new Configs();

  const guildRouter = express.Router();
  guildRouter.use(...apiTokenAuthHandlers());

  guildRouter.get("/available", async (req: Request, res: Response) => {
    const guilds = await allowedGuilds.getForApiUser(req.user.userId);
    res.json(guilds);
  });

  guildRouter.get("/:guildId", async (req: Request, res: Response) => {
    if (!(await hasGuildPermission(req.user.userId, req.params.guildId, ApiPermissions.ViewGuild))) {
      return unauthorized(res);
    }

    const guild = await allowedGuilds.find(req.params.guildId);
    res.json(guild);
  });

  guildRouter.post("/:guildId/check-permission", async (req: Request, res: Response) => {
    const permission = req.body.permission;
    const hasPermission = await hasGuildPermission(req.user.userId, req.params.guildId, permission);
    res.json({ result: hasPermission });
  });

  guildRouter.get(
    "/:guildId/config",
    requireGuildPermission(ApiPermissions.ReadConfig),
    async (req: Request, res: Response) => {
      const config = await configs.getActiveByKey(`guild-${req.params.guildId}`);
      res.json({ config: config ? config.config : "" });
    },
  );

  guildRouter.post("/:guildId/config", requireGuildPermission(ApiPermissions.EditConfig), async (req, res) => {
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

  guildRouter.get(
    "/:guildId/permissions",
    requireGuildPermission(ApiPermissions.ManageAccess),
    async (req: Request, res: Response) => {
      const permissions = await apiPermissionAssignments.getByGuildId(req.params.guildId);
      res.json(permissions);
    },
  );

  app.use("/guilds", guildRouter);
}
