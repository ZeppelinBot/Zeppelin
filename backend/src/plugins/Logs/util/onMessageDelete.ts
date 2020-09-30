import { SavedMessage } from "../../../data/entities/SavedMessage";
import { Attachment } from "eris";
import { useMediaUrls, stripObjectToScalars, resolveUser } from "../../../utils";
import { LogType } from "../../../data/LogType";
import moment from "moment-timezone";
import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";

export async function onMessageDelete(pluginData: GuildPluginData<LogsPluginType>, savedMessage: SavedMessage) {
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
