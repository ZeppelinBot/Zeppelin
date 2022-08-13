import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { ThreadChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogThreadUpdateData {
  oldThread: ThreadChannel;
  newThread: ThreadChannel;
  differenceString: string;
}

export function logThreadUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogThreadUpdateData) {
  return log(
    pluginData,
    LogType.THREAD_UPDATE,
    createTypedTemplateSafeValueContainer({
      oldThread: channelToTemplateSafeChannel(data.oldThread),
      newThread: channelToTemplateSafeChannel(data.newThread),
      differenceString: data.differenceString,
    }),
    {
      ...resolveChannelIds(data.newThread),
    },
  );
}
