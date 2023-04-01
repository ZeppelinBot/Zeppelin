import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { ISavedMessageAttachmentData, SavedMessage } from "../../../data/entities/SavedMessage";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser, useMediaUrls } from "../../../utils";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin";
import { FORMAT_NO_TIMESTAMP, LogsPluginType } from "../types";
import { log } from "../util/log";

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
      messageTextContent: data.message.data.content,
      bot: data.user instanceof User ? data.user.bot : false,
      ...resolveChannelIds(data.channel),
    },
  );
}
