import { Permissions, Snowflake, TextChannel } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { resolveUser, verboseChannelMention } from "../../../utils";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { AutoDeletePluginType } from "../types";
import { scheduleNextDeletion } from "./scheduleNextDeletion";

export async function deleteNextItem(pluginData: GuildPluginData<AutoDeletePluginType>) {
  const [itemToDelete] = pluginData.state.deletionQueue.splice(0, 1);
  if (!itemToDelete) return;

  scheduleNextDeletion(pluginData);

  const channel = pluginData.guild.channels.cache.get(itemToDelete.message.channel_id as Snowflake) as TextChannel;
  if (!channel) {
    // Channel was deleted, ignore
    return;
  }

  const logs = pluginData.getPlugin(LogsPlugin);
  const perms = channel.permissionsFor(pluginData.client.user!.id);

  if (!hasDiscordPermissions(perms, Permissions.FLAGS.VIEW_CHANNEL | Permissions.FLAGS.READ_MESSAGE_HISTORY)) {
    logs.logBotAlert({
      body: `Missing permissions to read messages or message history in auto-delete channel ${verboseChannelMention(
        channel,
      )}`,
    });
    return;
  }

  if (!hasDiscordPermissions(perms, Permissions.FLAGS.MANAGE_MESSAGES)) {
    logs.logBotAlert({
      body: `Missing permissions to delete messages in auto-delete channel ${verboseChannelMention(channel)}`,
    });
    return;
  }

  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  pluginData.state.guildLogs.ignoreLog(LogType.MESSAGE_DELETE, itemToDelete.message.id);
  (channel as TextChannel).messages.delete(itemToDelete.message.id as Snowflake).catch((err) => {
    if (err.code === 10008) {
      // "Unknown Message", probably already deleted by automod or another bot, ignore
      return;
    }

    logger.warn(err);
  });

  const user = await resolveUser(pluginData.client, itemToDelete.message.user_id);
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
