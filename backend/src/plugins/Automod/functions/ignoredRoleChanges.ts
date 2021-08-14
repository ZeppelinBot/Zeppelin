import { GuildPluginData } from "knub";
import { MINUTES } from "../../../utils";
import { AutomodPluginType } from "../types";

const IGNORED_ROLE_CHANGE_LIFETIME = 5 * MINUTES;

function cleanupIgnoredRoleChanges(pluginData: GuildPluginData<AutomodPluginType>) {
  const cutoff = Date.now() - IGNORED_ROLE_CHANGE_LIFETIME;
  for (const ignoredChange of pluginData.state.ignoredRoleChanges.values()) {
    if (ignoredChange.timestamp < cutoff) {
      pluginData.state.ignoredRoleChanges.delete(ignoredChange);
    }
  }
}

export function ignoreRoleChange(pluginData: GuildPluginData<AutomodPluginType>, memberId: string, roleId: string) {
  pluginData.state.ignoredRoleChanges.add({
    memberId,
    roleId,
    timestamp: Date.now(),
  });

  cleanupIgnoredRoleChanges(pluginData);
}

/**
 * @return Whether the role change should be ignored
 */
export function consumeIgnoredRoleChange(
  pluginData: GuildPluginData<AutomodPluginType>,
  memberId: string,
  roleId: string,
) {
  for (const ignoredChange of pluginData.state.ignoredRoleChanges.values()) {
    if (ignoredChange.memberId === memberId && ignoredChange.roleId === roleId) {
      pluginData.state.ignoredRoleChanges.delete(ignoredChange);
      return true;
    }
  }

  return false;
}
