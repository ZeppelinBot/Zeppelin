import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { ThreadChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogThreadDeleteData {
  thread: ThreadChannel;
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
