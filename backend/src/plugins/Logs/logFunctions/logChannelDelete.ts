import { GuildBasedChannel } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { resolveChannelIds } from "../../../utils/resolveChannelIds.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogChannelDeleteData {
  channel: GuildBasedChannel;
}

export function logChannelDelete(pluginData: GuildPluginData<LogsPluginType>, data: LogChannelDeleteData) {
  return log(
    pluginData,
    LogType.CHANNEL_DELETE,
    createTypedTemplateSafeValueContainer({
      channel: channelToTemplateSafeChannel(data.channel),
    }),
    {
      ...resolveChannelIds(data.channel),
    },
  );
}
