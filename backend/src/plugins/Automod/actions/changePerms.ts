import { PermissionsBitField, PermissionsString } from "discord.js";
import { U } from "ts-toolbelt";
import { z } from "zod";
import { TemplateParseError, TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import { isValidSnowflake, keys, noop, zBoundedCharacters } from "../../../utils.js";
import {
  guildToTemplateSafeGuild,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";

type LegacyPermMap = Record<string, keyof (typeof PermissionsBitField)["Flags"]>;
const legacyPermMap = {
  CREATE_INSTANT_INVITE: "CreateInstantInvite",
  KICK_MEMBERS: "KickMembers",
  BAN_MEMBERS: "BanMembers",
  ADMINISTRATOR: "Administrator",
  MANAGE_CHANNELS: "ManageChannels",
  MANAGE_GUILD: "ManageGuild",
  ADD_REACTIONS: "AddReactions",
  VIEW_AUDIT_LOG: "ViewAuditLog",
  PRIORITY_SPEAKER: "PrioritySpeaker",
  STREAM: "Stream",
  VIEW_CHANNEL: "ViewChannel",
  SEND_MESSAGES: "SendMessages",
  SEND_TTSMESSAGES: "SendTTSMessages",
  MANAGE_MESSAGES: "ManageMessages",
  EMBED_LINKS: "EmbedLinks",
  ATTACH_FILES: "AttachFiles",
  READ_MESSAGE_HISTORY: "ReadMessageHistory",
  MENTION_EVERYONE: "MentionEveryone",
  USE_EXTERNAL_EMOJIS: "UseExternalEmojis",
  VIEW_GUILD_INSIGHTS: "ViewGuildInsights",
  CONNECT: "Connect",
  SPEAK: "Speak",
  MUTE_MEMBERS: "MuteMembers",
  DEAFEN_MEMBERS: "DeafenMembers",
  MOVE_MEMBERS: "MoveMembers",
  USE_VAD: "UseVAD",
  CHANGE_NICKNAME: "ChangeNickname",
  MANAGE_NICKNAMES: "ManageNicknames",
  MANAGE_ROLES: "ManageRoles",
  MANAGE_WEBHOOKS: "ManageWebhooks",
  MANAGE_EMOJIS_AND_STICKERS: "ManageEmojisAndStickers",
  USE_APPLICATION_COMMANDS: "UseApplicationCommands",
  REQUEST_TO_SPEAK: "RequestToSpeak",
  MANAGE_EVENTS: "ManageEvents",
  MANAGE_THREADS: "ManageThreads",
  CREATE_PUBLIC_THREADS: "CreatePublicThreads",
  CREATE_PRIVATE_THREADS: "CreatePrivateThreads",
  USE_EXTERNAL_STICKERS: "UseExternalStickers",
  SEND_MESSAGES_IN_THREADS: "SendMessagesInThreads",
  USE_EMBEDDED_ACTIVITIES: "UseEmbeddedActivities",
  MODERATE_MEMBERS: "ModerateMembers",
} satisfies LegacyPermMap;

const realToLegacyMap = Object.entries(legacyPermMap).reduce((map, pair) => {
  map[pair[1]] = pair[0];
  return map;
}, {}) as Record<keyof typeof PermissionsBitField.Flags, keyof typeof legacyPermMap>;

const permissionNames = keys(PermissionsBitField.Flags) as U.ListOf<keyof typeof PermissionsBitField.Flags>;
const legacyPermissionNames = keys(legacyPermMap) as U.ListOf<keyof typeof legacyPermMap>;
const allPermissionNames = [...permissionNames, ...legacyPermissionNames] as const;

const permissionTypeMap = allPermissionNames.reduce(
  (map, permName) => {
    map[permName] = z.boolean().nullable();
    return map;
  },
  {} as Record<(typeof allPermissionNames)[number], z.ZodNullable<z.ZodBoolean>>,
);
const zPermissionsMap = z.strictObject(permissionTypeMap);

export const ChangePermsAction = automodAction({
  configSchema: z.strictObject({
    target: zBoundedCharacters(1, 2000),
    channel: zBoundedCharacters(1, 2000).nullable().default(null),
    perms: zPermissionsMap.partial(),
  }),

  async apply({ pluginData, contexts, actionConfig, ruleName }) {
    const user = contexts.find((c) => c.user)?.user;
    const message = contexts.find((c) => c.message)?.message;

    let target: string;
    try {
      target = await renderTemplate(
        actionConfig.target,
        new TemplateSafeValueContainer({
          user: user ? userToTemplateSafeUser(user) : null,
          guild: guildToTemplateSafeGuild(pluginData.guild),
          message: message ? savedMessageToTemplateSafeSavedMessage(message) : null,
        }),
      );
    } catch (err) {
      if (err instanceof TemplateParseError) {
        pluginData.getPlugin(LogsPlugin).logBotAlert({
          body: `Error in target format of automod rule ${ruleName}: ${err.message}`,
        });
        return;
      }
      throw err;
    }

    let channelId: string | null = null;
    if (actionConfig.channel) {
      try {
        channelId = await renderTemplate(
          actionConfig.channel,
          new TemplateSafeValueContainer({
            user: user ? userToTemplateSafeUser(user) : null,
            guild: guildToTemplateSafeGuild(pluginData.guild),
            message: message ? savedMessageToTemplateSafeSavedMessage(message) : null,
          }),
        );
      } catch (err) {
        if (err instanceof TemplateParseError) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Error in channel format of automod rule ${ruleName}: ${err.message}`,
          });
          return;
        }
        throw err;
      }
    }

    const role = pluginData.guild.roles.resolve(target);
    if (!role) {
      const member = await pluginData.guild.members.fetch(target).catch(noop);
      if (!member) return;
    }

    if (channelId && isValidSnowflake(channelId)) {
      const channel = pluginData.guild.channels.resolve(channelId);
      if (!channel || channel.isThread()) return;
      const overwrite = channel.permissionOverwrites.cache.find((pw) => pw.id === target);
      const allow = new PermissionsBitField(overwrite?.allow ?? 0n).serialize();
      const deny = new PermissionsBitField(overwrite?.deny ?? 0n).serialize();
      const newPerms: Partial<Record<PermissionsString, boolean | null>> = {};

      for (const key in allow) {
        const legacyKey = realToLegacyMap[key];
        const configEntry = actionConfig.perms[key] ?? actionConfig.perms[legacyKey];
        if (typeof configEntry !== "undefined") {
          newPerms[key] = configEntry;
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
      await channel.permissionOverwrites.edit(target, newPerms).catch(noop);
      return;
    }

    if (!role) return;

    const perms = new PermissionsBitField(role.permissions).serialize();
    for (const key in actionConfig.perms) {
      const realKey = legacyPermMap[key] ?? key;
      perms[realKey] = actionConfig.perms[key];
    }
    const permsArray = <PermissionsString[]>Object.keys(perms).filter((key) => perms[key]);
    await role.setPermissions(new PermissionsBitField(permsArray)).catch(noop);
  },
});
