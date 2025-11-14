import { BasePluginType, CooldownManager, guildPluginMessageCommand, pluginUtils } from "vety";
import { z } from "zod";
import { zBoundedCharacters, zBoundedRecord } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";

const zRoleMap = z.record(
  zBoundedCharacters(1, 100),
  z
    .array(zBoundedCharacters(1, 2000))
    .max(100)
    .transform((parsed) => parsed.map((v) => v.toLowerCase())),
);

const zSelfGrantableRoleEntry = z.strictObject({
  roles: zBoundedRecord(zRoleMap, 0, 100),
  can_use: z.boolean().default(false),
  can_ignore_cooldown: z.boolean().default(false),
  max_roles: z.number().default(0),
});
export type TSelfGrantableRoleEntry = z.infer<typeof zSelfGrantableRoleEntry>;

export const zSelfGrantableRolesConfig = z.strictObject({
  entries: zBoundedRecord(z.record(zBoundedCharacters(0, 255), zSelfGrantableRoleEntry), 0, 100).default({}),
  mention_roles: z.boolean().default(false),
});

export interface SelfGrantableRolesPluginType extends BasePluginType {
  configSchema: typeof zSelfGrantableRolesConfig;
  state: {
    cooldowns: CooldownManager;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const selfGrantableRolesCmd = guildPluginMessageCommand<SelfGrantableRolesPluginType>();
