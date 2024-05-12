import { BasePluginType, CooldownManager, guildPluginMessageCommand, pluginUtils } from "knub";
import z from "zod";
import { zBoundedCharacters, zBoundedRecord } from "../../utils";
import { CommonPlugin } from "../Common/CommonPlugin";

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
  entries: zBoundedRecord(z.record(zBoundedCharacters(0, 255), zSelfGrantableRoleEntry), 0, 100),
  mention_roles: z.boolean(),
});

export interface SelfGrantableRolesPluginType extends BasePluginType {
  config: z.infer<typeof zSelfGrantableRolesConfig>;
  state: {
    cooldowns: CooldownManager;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}

export const selfGrantableRolesCmd = guildPluginMessageCommand<SelfGrantableRolesPluginType>();
