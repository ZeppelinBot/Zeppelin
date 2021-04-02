import { AutomodContext, AutomodPluginType, TRule } from "../types";
import { GuildPluginData } from "knub";
import { AutomodTriggerMatchResult } from "../helpers";
import { convertDelayStringToMS } from "../../../utils";

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
