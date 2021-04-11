import { GuildPluginData } from "knub";
import { AutoDeletePluginType } from "../types";
import moment from "moment-timezone";
import { LogType } from "../../../data/LogType";
import { resolveUser, stripObjectToScalars, verboseChannelMention } from "../../../utils";
import { logger } from "../../../logger";
import { scheduleNextDeletion } from "./scheduleNextDeletion";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";
import { Constants } from "eris";
import { LogsPlugin } from "../../Logs/LogsPlugin";

export async function deleteNextItem(pluginData: GuildPluginData<AutoDeletePluginType>) {
  const [itemToDelete] = pluginData.state.deletionQueue.splice(0, 1);
  if (!itemToDelete) return;

  scheduleNextDeletion(pluginData);

  const channel = pluginData.guild.channels.get(itemToDelete.message.channel_id);
  if (!channel) {
    // Channel was deleted, ignore
    return;
  }

  const logs = pluginData.getPlugin(LogsPlugin);
  const perms = channel.permissionsOf(pluginData.client.user.id);

  if (!hasDiscordPermissions(perms, Constants.Permissions.readMessages | Constants.Permissions.readMessageHistory)) {
    logs.log(LogType.BOT_ALERT, {
      body: `Missing permissions to read messages or message history in auto-delete channel ${verboseChannelMention(
        channel,
      )}`,
    });
    return;
  }

  if (!hasDiscordPermissions(perms, Constants.Permissions.manageMessages)) {
    logs.log(LogType.BOT_ALERT, {
      body: `Missing permissions to delete messages in auto-delete channel ${verboseChannelMention(channel)}`,
    });
    return;
  }

  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  pluginData.state.guildLogs.ignoreLog(LogType.MESSAGE_DELETE, itemToDelete.message.id);
  pluginData.client.deleteMessage(itemToDelete.message.channel_id, itemToDelete.message.id).catch(logger.warn);

  const user = await resolveUser(pluginData.client, itemToDelete.message.user_id);
  const messageDate = timeAndDate
    .inGuildTz(moment.utc(itemToDelete.message.data.timestamp, "x"))
    .format(timeAndDate.getDateFormat("pretty_datetime"));

  pluginData.state.guildLogs.log(LogType.MESSAGE_DELETE_AUTO, {
    message: itemToDelete.message,
    user: stripObjectToScalars(user),
    channel: stripObjectToScalars(channel),
    messageDate,
  });
}
