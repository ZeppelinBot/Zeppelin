import { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { PingableRole } from "../../../data/entities/PingableRole.js";
import { PingableRolesPluginType } from "../types.js";

export function enablePingableRoles(
  pluginData: GuildPluginData<PingableRolesPluginType>,
  pingableRoles: PingableRole[],
) {
  for (const pingableRole of pingableRoles) {
    const role = pluginData.guild.roles.cache.get(pingableRole.role_id as Snowflake);
    if (!role) continue;

    role.setMentionable(true, "Enable pingable role");
  }
}
