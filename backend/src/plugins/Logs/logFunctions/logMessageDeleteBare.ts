import { GuildTextBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogMessageDeleteBareData {
  messageId: string;
  channel: GuildTextBasedChannel;
}

export function logMessageDeleteBare(pluginData: GuildPluginData<LogsPluginType>, data: LogMessageDeleteBareData) {
  return log(
    pluginData,
    LogType.MESSAGE_DELETE_BARE,
    createTypedTemplateSafeValueContainer({
      messageId: data.messageId,
      channel: channelToTemplateSafeChannel(data.channel),
    }),
    {
      ...resolveChannelIds(data.channel),
    },
  );
}
