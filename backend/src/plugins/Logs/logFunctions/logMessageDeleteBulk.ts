import { GuildTextBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMessageDeleteBulkData {
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
