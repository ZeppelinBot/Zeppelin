import { GuildBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogChannelCreateData {
  channel: GuildBasedChannel;
}

export function logChannelCreate(pluginData: GuildPluginData<LogsPluginType>, data: LogChannelCreateData) {
  return log(
    pluginData,
    LogType.CHANNEL_CREATE,
    createTypedTemplateSafeValueContainer({
      channel: channelToTemplateSafeChannel(data.channel),
    }),
    {
      ...resolveChannelIds(data.channel),
    },
  );
}
