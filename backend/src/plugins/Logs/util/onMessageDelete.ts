import { MessageAttachment, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { resolveUser, stripObjectToScalars, useMediaUrls } from "../../../utils";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { FORMAT_NO_TIMESTAMP, LogsPluginType } from "../types";

export async function onMessageDelete(pluginData: GuildPluginData<LogsPluginType>, savedMessage: SavedMessage) {
  const user = await resolveUser(pluginData.client, savedMessage.user_id);
  const channel = pluginData.guild.channels.cache.get(savedMessage.channel_id as Snowflake);

  if (user) {
    // Replace attachment URLs with media URLs
    if (savedMessage.data.attachments) {
      for (const attachment of savedMessage.data.attachments as MessageAttachment[]) {
        attachment.url = useMediaUrls(attachment.url);
      }
    }

    // See comment on FORMAT_NO_TIMESTAMP in types.ts
    const config = pluginData.config.get();
    const timestampFormat =
      (config.format.timestamp !== FORMAT_NO_TIMESTAMP ? config.format.timestamp : null) ?? config.timestamp_format;

    pluginData.state.guildLogs.log(
      LogType.MESSAGE_DELETE,
      {
        user: stripObjectToScalars(user),
        channel: stripObjectToScalars(channel),
        messageDate: pluginData
          .getPlugin(TimeAndDatePlugin)
          .inGuildTz(moment.utc(savedMessage.data.timestamp, "x"))
          .format(timestampFormat),
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
