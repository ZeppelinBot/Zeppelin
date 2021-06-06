import { GuildPluginData } from "knub";
import { convertDelayStringToMS } from "../../../utils";
import { AutomodContext, AutomodPluginType, TRule } from "../types";

export function checkAndUpdateCooldown(
  pluginData: GuildPluginData<AutomodPluginType>,
  rule: TRule,
  context: AutomodContext,
) {
  const cooldownKey = `${rule.name}-${context.user?.id}`;

  if (cooldownKey) {
    if (pluginData.state.cooldownManager.isOnCooldown(cooldownKey)) {
      return true;
    }

    const cooldownTime = convertDelayStringToMS(rule.cooldown, "s");
    if (cooldownTime) {
      pluginData.state.cooldownManager.setCooldown(cooldownKey, cooldownTime);
    }
  }

  return false;
}
