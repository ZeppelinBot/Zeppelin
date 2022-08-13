import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildChannel, NewsChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogChannelCreateData {
  channel: GuildChannel | NewsChannel;
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
