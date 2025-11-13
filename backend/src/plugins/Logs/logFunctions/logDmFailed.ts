import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { UnknownUser } from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogDmFailedData {
  source: string;
  user: User | UnknownUser;
}

export function logDmFailed(pluginData: GuildPluginData<LogsPluginType>, data: LogDmFailedData) {
  return log(
    pluginData,
    LogType.DM_FAILED,
    createTypedTemplateSafeValueContainer({
      source: data.source,
      user: userToTemplateSafeUser(data.user),
    }),
    {
      userId: data.user.id,
      bot: data.user instanceof User ? data.user.bot : false,
    },
  );
}
