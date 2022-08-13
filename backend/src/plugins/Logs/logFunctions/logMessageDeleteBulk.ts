import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, GuildTextBasedChannel, ThreadChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogMessageDeleteBulkData {
  count: number;
  authorIds: string[];
  channel: GuildTextBasedChannel;
  archiveUrl: string;
}

export function logMessageDeleteBulk(pluginData: GuildPluginData<LogsPluginType>, data: LogMessageDeleteBulkData) {
  return log(
    pluginData,
    LogType.MESSAGE_DELETE_BULK,
    createTypedTemplateSafeValueContainer({
      count: data.count,
      authorIds: data.authorIds,
      channel: channelToTemplateSafeChannel(data.channel),
      archiveUrl: data.archiveUrl,
    }),
    {
      ...resolveChannelIds(data.channel),
    },
  );
}
