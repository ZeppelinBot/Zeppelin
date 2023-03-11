import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User, GuildTextBasedChannel } from "discord.js";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

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
