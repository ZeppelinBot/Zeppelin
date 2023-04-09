import { GuildTextBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
