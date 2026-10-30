import { z } from "zod";
import { isTruthy, unique } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { automodAction } from "../helpers.js";

const isActionConfigured = (value) => {
  if (value === false) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
};

export const LogAction = automodAction({
  configSchema: z.boolean().default(true),
  async apply({ pluginData, contexts, ruleName, matchResult, prettyName }) {
    const users = unique(contexts.map((c) => c.user)).filter(isTruthy);
    const user = users[0];
    
    const rules = pluginData.config.get().rules[ruleName];
    const actions = rules.actions;
    
    const enabledActions = Object.entries(actions)
      .filter(([, actionConfig]) => isActionConfigured(actionConfig))
      .map(([name]) => name)
      .join(", ");
    
    pluginData.getPlugin(LogsPlugin).logAutomodAction({
      rule: ruleName,
      prettyName,
      user,
      users,
      actionsTaken: enabledActions,
      matchSummary: matchResult.summary ?? "",
    });
  },
});
