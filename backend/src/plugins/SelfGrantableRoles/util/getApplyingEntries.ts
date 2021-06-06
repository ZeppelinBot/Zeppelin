import { GuildPluginData } from "knub";
import { SelfGrantableRolesPluginType, TSelfGrantableRoleEntry } from "../types";

export async function getApplyingEntries(
  pluginData: GuildPluginData<SelfGrantableRolesPluginType>,
  msg,
): Promise<TSelfGrantableRoleEntry[]> {
  const config = await pluginData.config.getForMessage(msg);
  return Object.entries(config.entries)
    .filter(
      ([k, e]) =>
        e.can_use && !(!e.can_ignore_cooldown && pluginData.state.cooldowns.isOnCooldown(`${k}:${msg.author.id}`)),
    )
    .map(pair => pair[1]);
}
