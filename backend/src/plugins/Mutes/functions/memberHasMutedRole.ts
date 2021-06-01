import { GuildPluginData } from "knub";
import { MutesPluginType } from "../types";

export function memberHasMutedRole(pluginData: GuildPluginData<MutesPluginType>, member: Member): boolean {
  const muteRole = pluginData.config.get().mute_role;
  return muteRole ? member.roles.includes(muteRole) : false;
}
