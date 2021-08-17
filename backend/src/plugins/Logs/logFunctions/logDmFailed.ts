import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogDmFailedData {
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
