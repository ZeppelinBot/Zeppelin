import { Member } from "eris";
import { PluginData } from "knub";
import { MutesPluginType } from "../types";

export function memberHasMutedRole(pluginData: PluginData<MutesPluginType>, member: Member) {
  return member.roles.includes(pluginData.config.get().mute_role);
}
