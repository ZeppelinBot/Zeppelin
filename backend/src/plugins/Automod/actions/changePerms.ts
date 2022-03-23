import { Permissions, PermissionString } from "discord.js";
import * as t from "io-ts";
import { automodAction } from "../helpers";
import { tNullable, isValidSnowflake, tPartialDictionary } from "../../../utils";
import { noop } from "knub/dist/utils";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter";
import {
  guildToTemplateSafeGuild,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";

export const ChangePermsAction = automodAction({
  configType: t.type({
    target: t.string,
    channel: tNullable(t.string),
    perms: tPartialDictionary(t.keyof(Permissions.FLAGS), tNullable(t.boolean)),
  }),
  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const user = contexts.find((c) => c.user)?.user;
    const message = contexts.find((c) => c.message)?.message;

    const renderTarget = async (str: string) =>
      renderTemplate(
        str,
        new TemplateSafeValueContainer({
          user: user ? userToTemplateSafeUser(user) : null,
          guild: guildToTemplateSafeGuild(pluginData.guild),
          msg: message ? savedMessageToTemplateSafeSavedMessage(message) : null,
        }),
      );
    const renderChannel = async (str: string) =>
      renderTemplate(
        str,
        new TemplateSafeValueContainer({
          user: user ? userToTemplateSafeUser(user) : null,
          guild: guildToTemplateSafeGuild(pluginData.guild),
          msg: message ? savedMessageToTemplateSafeSavedMessage(message) : null,
        }),
      );
    const target = await renderTarget(actionConfig.target);
    const channelId = actionConfig.channel ? await renderChannel(actionConfig.channel) : null;
    const role = pluginData.guild.roles.resolve(target);
    if (!role) {
      const member = await pluginData.guild.members.fetch(target).catch(noop);
      if (!member) return;
    }

    if (channelId && isValidSnowflake(channelId)) {
      const channel = pluginData.guild.channels.resolve(channelId);
      if (!channel || channel.isThread()) return;
      const overwrite = channel.permissionOverwrites.cache.find((pw) => pw.id === target);
      const allow = new Permissions(overwrite?.allow ?? 0n).serialize();
      const deny = new Permissions(overwrite?.deny ?? 0n).serialize();
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

      // takes more code lines but looks cleaner imo
      let hasPerms = false;
      for (const key in newPerms) {
        if (typeof newPerms[key] === "boolean") {
          hasPerms = true;
          break;
        }
      }
      if (overwrite && !hasPerms) {
        await channel.permissionOverwrites.delete(target).catch(noop);
        return;
      }
      await channel.permissionOverwrites.create(target, newPerms).catch(noop);
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
