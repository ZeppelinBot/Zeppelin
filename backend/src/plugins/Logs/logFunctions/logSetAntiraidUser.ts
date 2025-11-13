import { User } from "discord.js";
import { GuildPluginData } from "vety";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

export interface LogSetAntiraidUserData {
  level: string;
  user: User;
}

export function logSetAntiraidUser(pluginData: GuildPluginData<LogsPluginType>, data: LogSetAntiraidUserData) {
  return log(
    pluginData,
    LogType.SET_ANTIRAID_USER,
    createTypedTemplateSafeValueContainer({
      level: data.level,
      user: userToTemplateSafeUser(data.user),
    }),
    {
      userId: data.user.id,
      bot: data.user.bot,
    },
  );
}
