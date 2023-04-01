import { GuildTextBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogMessageDeleteBareData {
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
