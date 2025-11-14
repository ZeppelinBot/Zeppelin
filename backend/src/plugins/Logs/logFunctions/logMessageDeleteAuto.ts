import { GuildBasedChannel, User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { ISavedMessageAttachmentData, SavedMessage } from "../../../data/entities/SavedMessage.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser, useMediaUrls } from "../../../utils.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import {
  channelToTemplateSafeChannel,
  savedMessageToTemplateSafeSavedMessage,
  userToTemplateSafeUser,
} from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";
import { getMessageReplyLogInfo } from "../util/getMessageReplyLogInfo.js";

export interface LogMessageDeleteAutoData {
  message: SavedMessage;
  user: User | UnknownUser;
  channel: GuildBasedChannel;
  messageDate: string;
}

export async function logMessageDeleteAuto(pluginData: GuildPluginData<LogsPluginType>, data: LogMessageDeleteAutoData) {
  if (data.message.data.attachments) {
    for (const attachment of data.message.data.attachments as ISavedMessageAttachmentData[]) {
      attachment.url = useMediaUrls(attachment.url);
    }
  }

  const { replyInfo, reply } = await getMessageReplyLogInfo(pluginData, data.message);

  return log(
    pluginData,
    LogType.MESSAGE_DELETE_AUTO,
    createTypedTemplateSafeValueContainer({
      message: savedMessageToTemplateSafeSavedMessage(data.message),
      user: userToTemplateSafeUser(data.user),
      channel: channelToTemplateSafeChannel(data.channel),
      messageDate: data.messageDate,
      replyInfo,
      reply,
    }),
    {
      userId: data.user.id,
      bot: data.user instanceof User ? data.user.bot : false,
      ...resolveChannelIds(data.channel),
    },
  );
}
