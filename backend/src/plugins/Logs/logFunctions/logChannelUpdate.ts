import { GuildBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

interface LogChannelUpdateData {
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
