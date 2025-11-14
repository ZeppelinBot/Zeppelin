import { GuildPluginData } from "vety";
import { AutomodContext, AutomodPluginType, TRule } from "../types.js";

export function checkCooldown(
  pluginData: GuildPluginData<AutomodPluginType>,
  rule: TRule,
  ruleName: string,
  context: AutomodContext,
) {
  const cooldownKey = `${ruleName}-${context.user?.id}`;

  return pluginData.state.cooldownManager.isOnCooldown(cooldownKey);
}
