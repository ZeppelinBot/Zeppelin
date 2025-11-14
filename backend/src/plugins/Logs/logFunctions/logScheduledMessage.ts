import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogScheduledMessageData {
  author: User;
  channel: GuildTextBasedChannel;
  datetime: string;
  date: string;
  time: string;
}

export function logScheduledMessage(pluginData: GuildPluginData<LogsPluginType>, data: LogScheduledMessageData) {
  return log(
    pluginData,
    LogType.SCHEDULED_MESSAGE,
    createTypedTemplateSafeValueContainer({
      author: userToTemplateSafeUser(data.author),
      channel: channelToTemplateSafeChannel(data.channel),
      datetime: data.datetime,
      date: data.date,
      time: data.time,
    }),
    {
      userId: data.author.id,
      bot: data.author.bot,
      ...resolveChannelIds(data.channel),
    },
  );
}
