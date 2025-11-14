import { AnyThreadChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogThreadUpdateData {
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
