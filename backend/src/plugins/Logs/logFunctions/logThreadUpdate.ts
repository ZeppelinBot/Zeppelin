import { AnyThreadChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogThreadUpdateData {
  oldThread: AnyThreadChannel;
  newThread: AnyThreadChannel;
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
