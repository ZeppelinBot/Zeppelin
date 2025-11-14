import { PermissionsBitField, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { LogType } from "../../../data/LogType.js";
import { logger } from "../../../logger.js";
import { resolveUser, verboseChannelMention } from "../../../utils.js";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { AutoDeletePluginType } from "../types.js";
import { scheduleNextDeletion } from "./scheduleNextDeletion.js";

export async function deleteNextItem(pluginData: GuildPluginData<AutoDeletePluginType>) {
  const [itemToDelete] = pluginData.state.deletionQueue.splice(0, 1);
  if (!itemToDelete) return;

  scheduleNextDeletion(pluginData);

  const channel = pluginData.guild.channels.cache.get(itemToDelete.message.channel_id as Snowflake);
  if (!channel || !("messages" in channel)) {
    // Channel does not exist or does not support messages, ignore
    return;
  }

  const logs = pluginData.getPlugin(LogsPlugin);
  const perms = channel.permissionsFor(pluginData.client.user!.id);

  if (
    !hasDiscordPermissions(perms, PermissionsBitField.Flags.ViewChannel | PermissionsBitField.Flags.ReadMessageHistory)
  ) {
    logs.logBotAlert({
      body: `Missing permissions to read messages or message history in auto-delete channel ${verboseChannelMention(
        channel,
      )}`,
    });
    return;
  }

  if (!hasDiscordPermissions(perms, PermissionsBitField.Flags.ManageMessages)) {
    logs.logBotAlert({
      body: `Missing permissions to delete messages in auto-delete channel ${verboseChannelMention(channel)}`,
    });
    return;
  }

  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  pluginData.state.guildLogs.ignoreLog(LogType.MESSAGE_DELETE, itemToDelete.message.id);
  channel.messages.delete(itemToDelete.message.id as Snowflake).catch((err) => {
    if (err.code === 10008) {
      // "Unknown Message", probably already deleted by automod or another bot, ignore
      return;
    }

    logger.warn(err);
  });

  const user = await resolveUser(pluginData.client, itemToDelete.message.user_id, "AutoDelete:deleteNextItem");
  const messageDate = timeAndDate
    .inGuildTz(moment.utc(itemToDelete.message.data.timestamp, "x"))
    .format(timeAndDate.getDateFormat("pretty_datetime"));

  pluginData.getPlugin(LogsPlugin).logMessageDeleteAuto({
    message: itemToDelete.message,
    user,
    channel,
    messageDate,
  });
}
