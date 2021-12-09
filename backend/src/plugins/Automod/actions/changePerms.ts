import { Permissions, PermissionString } from "discord.js";
import * as t from "io-ts";
import { automodAction } from "../helpers";
import { tNullable, isValidSnowflake, tPartialDictionary } from "../../../utils";
import { noop } from "knub/dist/utils";

export const ChangePermsAction = automodAction({
  configType: t.type({
    target: t.string,
    channel: tNullable(t.string),
    perms: tPartialDictionary(t.keyof(Permissions.FLAGS), tNullable(t.boolean)),
  }),
  defaultConfig: {
    channel: "",
    perms: {
      SEND_MESSAGES: true,
    },
  },

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const role = await pluginData.guild.roles.fetch(actionConfig.target);
    if (!role) {
      const member = await pluginData.guild.members.fetch(actionConfig.target);
      if (!member) return;
    }

    if (actionConfig.channel && isValidSnowflake(actionConfig.channel)) {
      const channel = await pluginData.guild.channels.fetch(actionConfig.channel);
      if (!channel) return;
      const overwrite = channel.permissionOverwrites.cache.find((pw) => pw.id === actionConfig.target);
      const allow = new Permissions(overwrite ? overwrite.allow : "0").serialize();
      const deny = new Permissions(overwrite ? overwrite.deny : "0").serialize();
      const newPerms: Partial<Record<PermissionString, boolean | null>> = {};

      for (const key in allow) {
        if (typeof actionConfig.perms[key] !== "undefined") {
          newPerms[key] = actionConfig.perms[key];
          continue;
        }
        if (allow[key]) {
          newPerms[key] = true;
        } else if (deny[key]) {
          newPerms[key] = false;
        }
      }
      await channel.permissionOverwrites.create(actionConfig.target, newPerms).catch(noop);
      return;
    }

    if (!role) return;

    const perms = new Permissions(role.permissions).serialize();
    for (const key in actionConfig.perms) {
      perms[key] = actionConfig.perms[key];
    }
    const permsArray = <PermissionString[]>Object.keys(perms).filter((key) => perms[key]);
    await role.setPermissions(new Permissions(permsArray)).catch(noop);
  },
});
