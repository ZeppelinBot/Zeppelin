import { ApiPermissions } from "@shared/apiPermissions";
import express, { Request, Response } from "express";
import { YAMLException } from "js-yaml";
import moment from "moment-timezone";
import { validateGuildConfig } from "../../configValidator";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { ApiAuditLog } from "../../data/ApiAuditLog";
import { AuditLogEventTypes } from "../../data/apiAuditLogTypes";
import { ApiPermissionAssignments, ApiPermissionTypes } from "../../data/ApiPermissionAssignments";
import { Configs } from "../../data/Configs";
import { Queue } from "../../Queue";
import { isSnowflake } from "../../utils";
import { loadYamlSafely } from "../../utils/loadYamlSafely";
import { ObjectAliasError } from "../../utils/validateNoObjectAliases";
import { hasGuildPermission, requireGuildPermission } from "../permissions";
import { clientError, ok, serverError, unauthorized } from "../responses";

const apiPermissionAssignments = new ApiPermissionAssignments();
const auditLog = new ApiAuditLog();

export function initGuildsMiscAPI(router: express.Router) {
  const allowedGuilds = new AllowedGuilds();
  const configs = new Configs();

  const miscRouter = express.Router();

  miscRouter.get("/available", async (req: Request, res: Response) => {
    const guilds = await allowedGuilds.getForApiUser(req.user!.userId);
    res.json(guilds);
  });

  miscRouter.get(
    "/my-permissions", // a
    async (req: Request, res: Response) => {
      const permissions = await apiPermissionAssignments.getByUserId(req.user!.userId);
      res.json(permissions);
    },
  );

  miscRouter.get("/:guildId", async (req: Request, res: Response) => {
    if (!(await hasGuildPermission(req.user!.userId, req.params.guildId, ApiPermissions.ViewGuild))) {
      return unauthorized(res);
    }

    const guild = await allowedGuilds.find(req.params.guildId);
    res.json(guild);
  });

  miscRouter.post("/:guildId/check-permission", async (req: Request, res: Response) => {
    const permission = req.body.permission;
    const hasPermission = await hasGuildPermission(req.user!.userId, req.params.guildId, permission);
    res.json({ result: hasPermission });
  });

  miscRouter.get(
    "/:guildId/config",
    requireGuildPermission(ApiPermissions.ReadConfig),
    async (req: Request, res: Response) => {
      const config = await configs.getActiveByKey(`guild-${req.params.guildId}`);
      res.json({ config: config ? config.config : "" });
    },
  );

  miscRouter.post("/:guildId/config", requireGuildPermission(ApiPermissions.EditConfig), async (req, res) => {
    let config = req.body.config;
    if (config == null) return clientError(res, "No config supplied");

    config = config.trim() + "\n"; // Normalize start/end whitespace in the config

    const currentConfig = await configs.getActiveByKey(`guild-${req.params.guildId}`);
    if (currentConfig && config === currentConfig.config) {
      return ok(res);
    }

    // Validate config
    let parsedConfig;
    try {
      parsedConfig = loadYamlSafely(config);
    } catch (e) {
      if (e instanceof YAMLException) {
        return res.status(400).json({ errors: [e.message] });
      }

      if (e instanceof ObjectAliasError) {
        return res.status(400).json({ errors: [e.message] });
      }

      // tslint:disable-next-line:no-console
      console.error("Error when loading YAML: " + e.message);
      return serverError(res, "Server error");
    }

    if (parsedConfig == null) {
      parsedConfig = {};
    }

    const error = await validateGuildConfig(parsedConfig);
    if (error) {
      return res.status(422).json({ errors: [error] });
    }

    await configs.saveNewRevision(`guild-${req.params.guildId}`, config, req.user!.userId);

    ok(res);
  });

  miscRouter.get(
    "/:guildId/permissions",
    requireGuildPermission(ApiPermissions.ManageAccess),
    async (req: Request, res: Response) => {
      const permissions = await apiPermissionAssignments.getByGuildId(req.params.guildId);
      res.json(permissions);
    },
  );

  const permissionManagementQueue = new Queue();
  miscRouter.post(
    "/:guildId/set-target-permissions",
    requireGuildPermission(ApiPermissions.ManageAccess),
    async (req: Request, res: Response) => {
      await permissionManagementQueue.add(async () => {
        const { type, targetId, permissions, expiresAt } = req.body;

        if (type !== ApiPermissionTypes.User) {
          return clientError(res, "Invalid type");
        }
        if (!isSnowflake(targetId)) {
          return clientError(res, "Invalid targetId");
        }
        const validPermissions = new Set(Object.values(ApiPermissions));
        validPermissions.delete(ApiPermissions.Owner);
        if (!Array.isArray(permissions) || permissions.some((p) => !validPermissions.has(p))) {
          return clientError(res, "Invalid permissions");
        }
        if (expiresAt != null && !moment.utc(expiresAt).isValid()) {
          return clientError(res, "Invalid expiresAt");
        }

        const existingAssignment = await apiPermissionAssignments.getByGuildAndUserId(req.params.guildId, targetId);
        if (existingAssignment && existingAssignment.permissions.includes(ApiPermissions.Owner)) {
          return clientError(res, "Can't change owner permissions");
        }

        if (permissions.length === 0) {
          await apiPermissionAssignments.removeUser(req.params.guildId, targetId);
          await auditLog.addEntry(req.params.guildId, req.user!.userId, AuditLogEventTypes.REMOVE_API_PERMISSION, {
            type: ApiPermissionTypes.User,
            target_id: targetId,
          });
        } else {
          const existing = await apiPermissionAssignments.getByGuildAndUserId(req.params.guildId, targetId);
          if (existing) {
            await apiPermissionAssignments.updateUserPermissions(req.params.guildId, targetId, permissions);
            await auditLog.addEntry(req.params.guildId, req.user!.userId, AuditLogEventTypes.EDIT_API_PERMISSION, {
              type: ApiPermissionTypes.User,
              target_id: targetId,
              permissions,
              expires_at: existing.expires_at,
            });
          } else {
            await apiPermissionAssignments.addUser(req.params.guildId, targetId, permissions, expiresAt);
            await auditLog.addEntry(req.params.guildId, req.user!.userId, AuditLogEventTypes.ADD_API_PERMISSION, {
              type: ApiPermissionTypes.User,
              target_id: targetId,
              permissions,
              expires_at: expiresAt,
            });
          }
        }

        ok(res);
      });
    },
  );

  router.use("/", miscRouter);
}
