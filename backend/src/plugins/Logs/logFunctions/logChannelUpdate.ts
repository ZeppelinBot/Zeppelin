import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { GuildBasedChannel } from "discord.js";
import { channelToTemplateSafeChannel } from "../../../utils/templateSafeObjects";
import { resolveChannelIds } from "../../../utils/resolveChannelIds";

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
