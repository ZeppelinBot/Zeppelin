import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { UnknownUser } from "../../../utils";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { LogsPluginType } from "../types";
import { log } from "../util/log";

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
