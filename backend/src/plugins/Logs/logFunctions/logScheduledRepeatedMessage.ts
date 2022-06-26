import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, GuildTextBasedChannel, ThreadChannel, User } from "discord.js";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogScheduledRepeatedMessageData {
  author: User;
  channel: GuildTextBasedChannel;
  datetime: string;
  date: string;
  time: string;
  repeatInterval: string;
  repeatDetails: string;
}

export function logScheduledRepeatedMessage(
  pluginData: GuildPluginData<LogsPluginType>,
  data: LogScheduledRepeatedMessageData,
) {
  return log(
    pluginData,
    LogType.SCHEDULED_REPEATED_MESSAGE,
    createTypedTemplateSafeValueContainer({
      author: userToTemplateSafeUser(data.author),
      channel: channelToTemplateSafeChannel(data.channel),
      datetime: data.datetime,
      date: data.date,
      time: data.time,
      repeatInterval: data.repeatInterval,
      repeatDetails: data.repeatDetails,
    }),
    {
      userId: data.author.id,
      bot: data.author.bot,
      channel: data.channel.id,
      category: data.channel.parentId,
    },
  );
}
