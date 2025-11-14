import { AnyThreadChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogThreadCreateData {
  thread: AnyThreadChannel;
}

export function logThreadCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogThreadCreateData) {
  return log(
    pluginData,
    LogType.THREAD_CREATE,
    createTypedTemplateSafeValueContainer({
      thread: channelToTemplateSafeChannel(data.thread),
    }),
    {
      ...resolveChannelIds(data.thread),
    },
  );
}
