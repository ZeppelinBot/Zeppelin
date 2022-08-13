import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildChannel, NewsChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogChannelDeleteData {
  channel: GuildChannel | NewsChannel;
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
