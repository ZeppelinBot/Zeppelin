import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { getBaseUrl } from "../../../pluginUtils";

export async function onMessageDeleteBulk(pluginData: GuildPluginData<LogsPluginType>, savedMessages: SavedMessage[]) {
  const channel = pluginData.guild.channels.get(savedMessages[0].channel_id);
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild);
  const archiveUrl = pluginData.state.archives.getUrl(getBaseUrl(pluginData), archiveId);
  const authorIds = Array.from(new Set(savedMessages.map(item => `\`${item.user_id}\``))).join(", ");

  pluginData.state.guildLogs.log(
    LogType.MESSAGE_DELETE_BULK,
    {
      count: savedMessages.length,
      authorIds,
      channel,
      archiveUrl,
    },
    savedMessages[0].id,
  );
}
