import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildChannel, NewsChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

interface LogChannelUpdateData {
  oldChannel: GuildChannel | NewsChannel;
  newChannel: GuildChannel | NewsChannel;
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
