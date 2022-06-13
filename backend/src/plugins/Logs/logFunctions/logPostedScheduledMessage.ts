import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, GuildTextBasedChannel, ThreadChannel, User } from "discord.js";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogPostedScheduledMessageData {
  author: User;
  channel: GuildTextBasedChannel;
  messageId: string;
}

export function logPostedScheduledMessage(
  pluginData: GuildPluginData<LogsPluginType>,
  data: LogPostedScheduledMessageData,
) {
  return log(
    pluginData,
    LogType.POSTED_SCHEDULED_MESSAGE,
    createTypedTemplateSafeValueContainer({
      author: userToTemplateSafeUser(data.author),
      channel: channelToTemplateSafeChannel(data.channel),
      messageId: data.messageId,
    }),
    {
      userId: data.author.id,
      bot: data.author.bot,
      channel: data.channel.id,
      category: data.channel.parentId,
    },
  );
}
