import { GuildPluginData } from "knub";
import { AutomodContext, AutomodPluginType, TRule } from "../types";

export function checkCooldown(pluginData: GuildPluginData<AutomodPluginType>, rule: TRule, context: AutomodContext) {
  const cooldownKey = `${rule.name}-${context.user?.id}`;

  if (cooldownKey) {
    if (pluginData.state.cooldownManager.isOnCooldown(cooldownKey)) {
      return true;
    }
  }

  return false;
}
