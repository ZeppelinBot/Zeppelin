import { User } from "discord.js";
import { GuildPluginData } from "knub";
import { LogType } from "../../../data/LogType.js";
import { createTypedTemplateSafeValueContainer } from "../../../templateFormatter.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { LogsPluginType } from "../types.js";
import { log } from "../util/log.js";

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
      users: data.users.map((user) => userToTemplateSafeUser(user)),
      actionsTaken: data.actionsTaken,
      matchSummary: data.matchSummary ?? "",
    }),
    {
      userId: data.user ? data.user.id : null,
      bot: data.user ? data.user.bot : false,
    },
  );
}
