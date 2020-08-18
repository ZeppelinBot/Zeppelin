import { SavedMessage } from "src/data/entities/SavedMessage";
import { Attachment } from "eris";
import { useMediaUrls, stripObjectToScalars, resolveUser } from "src/utils";
import { LogType } from "src/data/LogType";
import moment from "moment-timezone";
import { PluginData } from "knub";
import { LogsPluginType } from "../types";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";

export async function onMessageDelete(pluginData: PluginData<LogsPluginType>, savedMessage: SavedMessage) {
  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.get(savedMessage.channel_id);

  if (user) {
    // Replace attachment URLs with media URLs
    if (savedMessage.data.attachments) {
      for (const attachment of savedMessage.data.attachments as Attachment[]) {
        attachment.url = useMediaUrls(attachment.url);
      }
    }

    pluginData.state.guildLogs.log(
      LogType.MESSAGE_DELETE,
      {
        user: stripObjectToScalars(user),
        channel: stripObjectToScalars(channel),
        messageDate: pluginData
          .getPlugin(TimeAndDatePlugin)
          .inGuildTz(moment.utc(savedMessage.data.timestamp, "x"))
          .format(pluginData.config.get().format.timestamp),
        message: savedMessage,
      },
      savedMessage.id,
    );
  } else {
    pluginData.state.guildLogs.log(
      LogType.MESSAGE_DELETE_BARE,
      {
        messageId: savedMessage.id,
        channel: stripObjectToScalars(channel),
      },
      savedMessage.id,
    );
  }
}
