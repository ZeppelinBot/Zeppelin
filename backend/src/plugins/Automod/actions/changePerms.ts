import { PermissionsBitField, PermissionsString } from "discord.js";
import * as t from "io-ts";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter";
import { isValidSnowflake, noop, tNullable, tPartialDictionary } from "../../../utils";
import {
  guildToTemplateSafeGuild,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { automodAction } from "../helpers";

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

export const ChangePermsAction = automodAction({
  configType: t.type({
    target: t.string,
    channel: tNullable(t.string),
    perms: tPartialDictionary(
      t.union([t.keyof(PermissionsBitField.Flags), t.keyof(legacyPermMap)]),
      tNullable(t.boolean),
    ),
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
          message: message ? savedMessageToTemplateSafeSavedMessage(message) : null,
        }),
      );
    const renderChannel = async (str: string) =>
      renderTemplate(
        str,
        new TemplateSafeValueContainer({
          user: user ? userToTemplateSafeUser(user) : null,
          guild: guildToTemplateSafeGuild(pluginData.guild),
          message: message ? savedMessageToTemplateSafeSavedMessage(message) : null,
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
