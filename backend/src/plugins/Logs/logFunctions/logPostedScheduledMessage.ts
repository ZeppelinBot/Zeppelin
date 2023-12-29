import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
      ...resolveChannelIds(data.channel),
    },
  );
}
