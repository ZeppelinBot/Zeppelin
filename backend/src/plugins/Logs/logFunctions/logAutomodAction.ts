import { GuildPluginData } from "knub";
import { LogsPluginType } from "../types";
import { LogType } from "../../../data/LogType";
import { log } from "../util/log";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter";
import { User } from "discord.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";

interface LogAutomodActionData {
  rule: string;
  user?: User | null;
  users: User[];
  actionsTaken: string;
  matchSummary: string;
}

export function logAutomodAction(pluginData: GuildPluginData<LogsPluginType>, data: LogAutomodActionData) {
  return log(
    pluginData,
    LogType.AUTOMOD_ACTION,
    createTypedTemplateSafeValueContainer({
      rule: data.rule,
      user: data.user ? userToTemplateSafeUser(data.user) : null,
      users: data.users.map(user => userToTemplateSafeUser(user)),
      actionsTaken: data.actionsTaken,
      matchSummary: data.matchSummary ?? "",
    }),
    {
      userId: data.user ? data.user.id : null,
      bot: data.user ? data.user.bot : false,
    },
  );
}
