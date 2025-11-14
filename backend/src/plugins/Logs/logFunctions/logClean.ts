import { GuildTextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogCleanData {
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
