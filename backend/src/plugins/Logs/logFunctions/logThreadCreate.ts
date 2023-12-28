import { AnyThreadChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogThreadCreateData {
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
