import { AuditLogEvent, EmbedData, GuildTextBasedChannel, Snowflake, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType.js";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { findMatchingAuditLogEntry } from "../../../utils/findMatchingAuditLogEntry.js";
import { resolveUser, UnknownUser } from "../../../utils.js";
import { logMessageEdit } from "../logFunctions/logMessageEdit.js";
import { logMessagePin } from "../logFunctions/logMessagePin.js";
import { logMessageUnpin } from "../logFunctions/logMessageUnpin.js";
import { LogsPluginType } from "../types.js";
import { isLogIgnored } from "./isLogIgnored.js";

export async function onMessageUpdate(
  pluginData: GuildPluginData<LogsPluginType>,
  savedMessage: SavedMessage,
  oldSavedMessage: SavedMessage,
) {
  // To log a message update, either the message content or a rich embed has to change
  let logUpdate = false;

  const oldEmbedsToCompare = ((oldSavedMessage.data.embeds || []) as EmbedData[])
    .map((e) => structuredClone(e))
    .filter((e) => e.type === "rich");

  const newEmbedsToCompare = ((savedMessage.data.embeds || []) as EmbedData[])
    .map((e) => structuredClone(e))
    .filter((e) => e.type === "rich");

  for (const embed of [...oldEmbedsToCompare, ...newEmbedsToCompare]) {
    if (embed.thumbnail) {
      delete embed.thumbnail.width;
      delete embed.thumbnail.height;
    }

    if (embed.image) {
      delete embed.image.width;
      delete embed.image.height;
    }
  }

  if (
    oldSavedMessage.data.content !== savedMessage.data.content ||
    oldEmbedsToCompare.length !== newEmbedsToCompare.length ||
    JSON.stringify(oldEmbedsToCompare) !== JSON.stringify(newEmbedsToCompare)
  ) {
    logUpdate = true;
  }

  const wasPinned = oldSavedMessage.data.pinned ?? false;
  const isPinned = savedMessage.data.pinned ?? false;
  const pinStateChanged = wasPinned !== isPinned;

  if (!logUpdate && !pinStateChanged) {
    return;
  }

  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const resolvedChannel = pluginData.guild.channels.resolve(savedMessage.channel_id as Snowflake);
  if (!resolvedChannel || !resolvedChannel.isTextBased()) {
    return;
  }
  const channel = resolvedChannel as GuildTextBasedChannel;

  if (logUpdate) {
    logMessageEdit(pluginData, {
      user,
      channel,
      before: oldSavedMessage,
      after: savedMessage,
    });
  }

  if (pinStateChanged) {
    const logType = isPinned ? LogType.MESSAGE_PIN : LogType.MESSAGE_UNPIN;
    if (!isLogIgnored(pluginData, logType, savedMessage.id)) {
      const auditLogAction = isPinned ? AuditLogEvent.MessagePin : AuditLogEvent.MessageUnpin;
      const relevantAuditLogEntry = await findMatchingAuditLogEntry(
        pluginData.guild,
        auditLogAction,
        savedMessage.user_id,
      );

      let mod: User | UnknownUser | null = null;
      let skipMod = false;

      if (relevantAuditLogEntry?.extra) {
        const extra: any = relevantAuditLogEntry.extra;
        if (
          (extra?.channel?.id && extra.channel.id !== savedMessage.channel_id) ||
          (extra?.messageId && extra.messageId !== savedMessage.id)
        ) {
          skipMod = true;
        }
      }

      if (!skipMod && relevantAuditLogEntry?.executor?.id) {
        mod = await resolveUser(pluginData.client, relevantAuditLogEntry.executor.id);
      }

      const logFn = isPinned ? logMessagePin : logMessageUnpin;
      logFn(pluginData, {
        mod,
        user,
        channel,
        message: savedMessage,
      });
    }
  }
}
