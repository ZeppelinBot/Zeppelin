import { Member } from "eris";
import { GuildPluginData } from "knub";
import { MutesPluginType } from "../types";

export function memberHasMutedRole(pluginData: GuildPluginData<MutesPluginType>, member: Member) {
  return member.roles.includes(pluginData.config.get().mute_role);
}
