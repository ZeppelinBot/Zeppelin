import { GuildPluginData } from "knub";
import { FORMAT_NO_TIMESTAMP, LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, GuildTextBasedChannel, ThreadChannel, User } from "discord.js";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import moment from "moment-timezone";
import { ISavedMessageAttachmentData, SavedMessage } from "../../../data/entities/SavedMessage";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { UnknownUser, useMediaUrls } from "../../../utils";

interface LogMessageDeleteData {
  user: User | UnknownUser;
  channel: GuildTextBasedChannel;
  message: SavedMessage;
}

export function logMessageDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogMessageDeleteData) {
  // Replace attachment URLs with media URLs
  if (data.message.data.attachments) {
    for (const attachment of data.message.data.attachments as ISavedMessageAttachmentData[]) {
      attachment.url = useMediaUrls(attachment.url);
    }
  }

  // See comment on FORMAT_NO_TIMESTAMP in types.ts
  const config = pluginData.config.get();
  const timestampFormat =
    (config.format.timestamp !== FORMAT_NO_TIMESTAMP ? config.format.timestamp : null) ?? config.timestamp_format;

  return log(
    pluginData,
    LogType.MESSAGE_DELETE,
    createTypedTemplateSafeValueContainer({
      user: userToTemplateSafeUser(data.user),
      channel: channelToTemplateSafeChannel(data.channel),
      message: savedMessageToTemplateSafeSavedMessage(data.message),
      messageDate: pluginData
        .getPlugin(TimeAndDatePlugin)
        .inGuildTz(moment.utc(data.message.data.timestamp, "x"))
        .format(timestampFormat),
    }),
    {
      userId: data.user.id,
      channel: data.channel.id,
      category: data.channel.parentId,
      messageTextContent: data.message.data.content,
      bot: data.user instanceof User ? data.user.bot : false,
    },
  );
}
