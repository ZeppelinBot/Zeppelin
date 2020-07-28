import * as t from "io-ts";
import { automodAction } from "../helpers";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars } from "../../../utils";

export const LogAction = automodAction({
  configType: t.boolean,

  async apply({ pluginData, contexts, ruleName, matchResult }) {
    const safeUsers = contexts.map(c => c.user && stripObjectToScalars(c.user)).filter(Boolean);
    const safeUser = safeUsers[0];
    const actionsTaken = Object.keys(pluginData.config.get().rules[ruleName].actions);

    pluginData.getPlugin(LogsPlugin).log(LogType.AUTOMOD_ACTION, {
      rule: ruleName,
      user: safeUser,
      users: safeUsers,
      actionsTaken,
      matchSummary: matchResult.summary,
    });
  },
});
