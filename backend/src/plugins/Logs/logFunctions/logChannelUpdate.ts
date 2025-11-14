import { GuildBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogChannelUpdateData {
  oldChannel: GuildBasedChannel;
  newChannel: GuildBasedChannel;
  differenceString: string;
}

export function logChannelUpdate(pluginData: GuildPluginData<LogsPluginType>, data: LogChannelUpdateData) {
  return log(
    pluginData,
    LogType.CHANNEL_UPDATE,
    createTypedTemplateSafeValueContainer({
      oldChannel: channelToTemplateSafeChannel(data.oldChannel),
      newChannel: channelToTemplateSafeChannel(data.newChannel),
      differenceString: data.differenceString,
    }),
    {
      ...resolveChannelIds(data.newChannel),
    },
  );
}
