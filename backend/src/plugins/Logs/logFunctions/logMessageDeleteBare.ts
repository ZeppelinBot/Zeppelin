import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, GuildTextBasedChannel, ThreadChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";

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
      channel: data.channel.id,
      category: data.channel.parentId,
    },
  );
}
