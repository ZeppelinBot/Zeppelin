import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { ThreadChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";

interface LogThreadCreateData {
  thread: ThreadChannel;
}

export function logThreadCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogThreadCreateData) {
  return log(
    pluginData,
    LogType.THREAD_CREATE,
    createTypedTemplateSafeValueContainer({
      thread: channelToTemplateSafeChannel(data.thread),
    }),
    {
      channel: data.thread.parentId,
      category: data.thread.parent?.parentId,
    },
  );
}
