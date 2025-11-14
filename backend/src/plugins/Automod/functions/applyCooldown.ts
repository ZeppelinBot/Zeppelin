import { GuildPluginData } from "vety";
import { convertDelayStringToMS } from "../../../utils.js";
import { AutomodContext, AutomodPluginType, TRule } from "../types.js";

export function applyCooldown(
  pluginData: GuildPluginData<AutomodPluginType>,
  rule: TRule,
  ruleName: string,
  context: AutomodContext,
) {
  const cooldownKey = `${ruleName}-${context.user?.id}`;

  const cooldownTime = convertDelayStringToMS(rule.cooldown, "s");
  if (cooldownTime) pluginData.state.cooldownManager.setCooldown(cooldownKey, cooldownTime);
}
