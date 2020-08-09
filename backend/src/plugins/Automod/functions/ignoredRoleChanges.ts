import { PluginData } from "knub";
import { AutomodPluginType } from "../types";
import { MINUTES } from "../../../utils";

const IGNORED_ROLE_CHANGE_LIFETIME = 5 * MINUTES;

function cleanupIgnoredRoleChanges(pluginData: PluginData<AutomodPluginType>) {
  const cutoff = Date.now() - IGNORED_ROLE_CHANGE_LIFETIME;
  for (const ignoredChange of pluginData.state.ignoredRoleChanges.values()) {
    if (ignoredChange.timestamp < cutoff) {
      pluginData.state.ignoredRoleChanges.delete(ignoredChange);
    }
  }
}

export function ignoreRoleChange(pluginData: PluginData<AutomodPluginType>, memberId: string, roleId: string) {
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
export function consumeIgnoredRoleChange(pluginData: PluginData<AutomodPluginType>, memberId: string, roleId: string) {
  for (const ignoredChange of pluginData.state.ignoredRoleChanges.values()) {
    if (ignoredChange.memberId === memberId && ignoredChange.roleId === roleId) {
      pluginData.state.ignoredRoleChanges.delete(ignoredChange);
      return true;
    }
  }

  return false;
}
