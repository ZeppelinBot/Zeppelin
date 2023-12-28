import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
