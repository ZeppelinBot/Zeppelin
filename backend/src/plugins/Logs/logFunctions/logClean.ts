import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogCleanData {
  mod: User;
  channel: GuildTextBasedChannel;
  count: number;
  archiveUrl: string;
}

export function logClean(pluginData: GuildPluginData<LogsPluginType>, data: LogCleanData) {
  return log(
    pluginData,
    LogType.CLEAN,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      channel: channelToTemplateSafeChannel(data.channel),
      count: data.count,
      archiveUrl: data.archiveUrl,
    }),
    {
      ...resolveChannelIds(data.channel),
    },
  );
}
