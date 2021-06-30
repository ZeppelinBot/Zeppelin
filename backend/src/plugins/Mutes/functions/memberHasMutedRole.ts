import { GuildMember, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { MutesPluginType } from "../types";

export function memberHasMutedRole(pluginData: GuildPluginData<MutesPluginType>, member: GuildMember): boolean {
  const muteRole = pluginData.config.get().mute_role;
  return muteRole ? member.roles.cache.has(muteRole as Snowflake) : false;
}
