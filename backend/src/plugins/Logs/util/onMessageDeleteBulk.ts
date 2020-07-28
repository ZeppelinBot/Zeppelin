import { PluginData } from "knub";
import { LogsPluginType } from "../types";
import { SavedMessage } from "src/data/entities/SavedMessage";
import { LogType } from "src/data/LogType";
import { getBaseUrl } from "src/pluginUtils";

export async function onMessageDeleteBulk(pluginData: PluginData<LogsPluginType>, savedMessages: SavedMessage[]) {
  const channel = pluginData.guild.channels.get(savedMessages[0].channel_id);
  const archiveId = await pluginData.state.archives.createFromSavedMessages(savedMessages, pluginData.guild);
  const archiveUrl = pluginData.state.archives.getUrl(getBaseUrl, archiveId);

  pluginData.state.guildLogs.log(
    LogType.MESSAGE_DELETE_BULK,
    {
      count: savedMessages.length,
      channel,
      archiveUrl,
    },
    savedMessages[0].id,
  );
}
