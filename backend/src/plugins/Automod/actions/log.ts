import * as t from "io-ts";
import { LogType } from "../../../data/LogType";
import { stripObjectToScalars, unique } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { automodAction } from "../helpers";

export const LogAction = automodAction({
  configType: t.boolean,
  defaultConfig: true,

  async apply({ pluginData, contexts, ruleName, matchResult }) {
    const safeUsers = unique(contexts.map(c => c.user))
      .filter(Boolean)
      .map(user => stripObjectToScalars(user));
    const safeUser = safeUsers[0];
    const actionsTaken = Object.keys(pluginData.config.get().rules[ruleName].actions).join(", ");

    pluginData.getPlugin(LogsPlugin).log(LogType.AUTOMOD_ACTION, {
      rule: ruleName,
      user: safeUser,
      users: safeUsers,
      actionsTaken,
      matchSummary: matchResult.summary,
    });
  },
});
