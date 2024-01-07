import { GuildPluginData } from "knub";
import { convertDelayStringToMS } from "../../../utils";
import { AutomodContext, AutomodPluginType, TRule } from "../types";

export function applyCooldown(pluginData: GuildPluginData<AutomodPluginType>, rule: TRule, context: AutomodContext) {
  const cooldownKey = `${rule.name}-${context.user?.id}`;

  if (cooldownKey) {
    const cooldownTime = convertDelayStringToMS(rule.cooldown, "s");
    if (cooldownTime) {
      pluginData.state.cooldownManager.setCooldown(cooldownKey, cooldownTime);
    }
  }
}
