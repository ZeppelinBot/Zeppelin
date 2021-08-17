import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { BaseGuildTextChannel, User } from "discord.js";
import { channelToTemplateSafeChannel, userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogCleanData {
  mod: User;
  channel: BaseGuildTextChannel;
  count: number;
  archiveUrl: string;
}

export function logClean(pluginData: GuildPluginData<LogsPluginType>, data: LogCleanData) {
  return log(
    pluginData,
    LogType.CLEAN,
    createTypedTemplateSafeValueContainer({
      mod: userToTemplateSafeUser(data.mod),
      channel: channelToTemplateSafeChannel(data.channel),
      count: data.count,
      archiveUrl: data.archiveUrl,
    }),
    {
      channel: data.channel.id,
      category: data.channel.parentId,
    },
  );
}
