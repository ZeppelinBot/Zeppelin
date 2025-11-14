import { AnyThreadChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogThreadDeleteData {
  thread: AnyThreadChannel;
}

export function logThreadDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogThreadDeleteData) {
  return log(
    pluginData,
    LogType.THREAD_DELETE,
    createTypedTemplateSafeValueContainer({
      thread: channelToTemplateSafeChannel(data.thread),
    }),
    {
      ...resolveChannelIds(data.thread),
    },
  );
}
