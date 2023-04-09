import { AnyThreadChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogThreadDeleteData {
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
