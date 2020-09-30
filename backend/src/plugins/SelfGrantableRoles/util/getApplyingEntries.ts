import { TSelfGrantableRoleEntry, SelfGrantableRolesPluginType } from "../types";
import { GuildPluginData } from "knub";

export function getApplyingEntries(
  pluginData: GuildPluginData<SelfGrantableRolesPluginType>,
  msg,
): TSelfGrantableRoleEntry[] {
  const config = pluginData.config.getForMessage(msg);
  return Object.entries(config.entries)
    .filter(
      ([k, e]) =>
        e.can_use && !(!e.can_ignore_cooldown && pluginData.state.cooldowns.isOnCooldown(`${k}:${msg.author.id}`)),
    )
    .map(pair => pair[1]);
}
