import { GuildBasedChannel, Snowflake, TextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "vety";
import { SavedMessage } from "../../../data/entities/SavedMessage.js";
import { LogType } from "../../../data/LogType.js";
import { getBaseUrl } from "../../../pluginUtils.js";
import { chunkArray } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { UtilityPluginType } from "../types.js";

export async function cleanMessages(
  pluginData: GuildPluginData<UtilityPluginType>,
  channel: GuildBasedChannel & TextBasedChannel,
  savedMessages: SavedMessage[],
  mod: User,
) {
  pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, savedMessages[0].id);
  pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, savedMessages[0].id);

  // Delete & archive in ID order
  savedMessages = Array.from(savedMessages).sort((a, b) => (a.id > b.id ? 1 : -1));
  const idsToDelete = savedMessages.map((m) => m.id) as Snowflake[];

  // Make sure the deletions aren't double logged
  idsToDelete.forEach((id) => pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE, id));
  pluginData.state.logs.ignoreLog(LogType.MESSAGE_DELETE_BULK, idsToDelete[0]);

  // Actually delete the messages (in chunks of 100)

  const chunks = chunkArray(idsToDelete, 100);
  await Promise.all(
    chunks.map((chunk) =>
      Promise.all([channel.bulkDelete(chunk), pluginData.state.savedMessages.markBulkAsDeleted(chunk)]),
    ),
  );

  // Create an archive
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild);
  const baseUrl = getBaseUrl(pluginData);
  const archiveUrl = pluginData.state.archives.getUrl(baseUrl, archiveId);

  pluginData.getPlugin(LogsPlugin).logClean({
    mod,
    channel,
    count: savedMessages.length,
    archiveUrl,
  });

  return { archiveUrl };
}
