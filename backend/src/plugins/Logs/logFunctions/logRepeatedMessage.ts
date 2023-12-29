import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogRepeatedMessageData {
  author: User;
  channel: GuildTextBasedChannel;
  datetime: string;
  date: string;
  time: string;
  repeatInterval: string;
  repeatDetails: string;
}

export function logRepeatedMessage(pluginData: GuildPluginData<LogsPluginType>, data: LogRepeatedMessageData) {
  return log(
    pluginData,
    LogType.REPEATED_MESSAGE,
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
      ...resolveChannelIds(data.channel),
    },
  );
}
