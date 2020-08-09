import { PluginData } from "knub";
import { AutoDeletePluginType } from "../types";
import moment from "moment-timezone";
import { LogType } from "src/data/LogType";
import { stripObjectToScalars, resolveUser } from "src/utils";
import { logger } from "src/logger";
import { scheduleNextDeletion } from "./scheduleNextDeletion";
import { inGuildTz } from "../../../utils/timezones";
import { getDateFormat } from "../../../utils/dateFormats";

export async function deleteNextItem(pluginData: PluginData<AutoDeletePluginType>) {
  const [itemToDelete] = pluginData.state.deletionQueue.splice(0, 1);
  if (!itemToDelete) return;

  pluginData.state.guildLogs.ignoreLog(LogType.MESSAGE_DELETE, itemToDelete.message.id);
  pluginData.client.deleteMessage(itemToDelete.message.channel_id, itemToDelete.message.id).catch(logger.warn);

  scheduleNextDeletion(pluginData);

  const user = await resolveUser(pluginData.client, itemToDelete.message.user_id);
  const channel = pluginData.guild.channels.get(itemToDelete.message.channel_id);
  const messageDate = inGuildTz(pluginData, moment.utc(itemToDelete.message.data.timestamp, "x")).format(
    getDateFormat(pluginData, "pretty_datetime"),
  );

  pluginData.state.guildLogs.log(LogType.MESSAGE_DELETE_AUTO, {
    message: itemToDelete.message,
    user: stripObjectToScalars(user),
    channel: stripObjectToScalars(channel),
    messageDate,
  });
}
