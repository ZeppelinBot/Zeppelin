import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogSetAntiraidUserData {
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
