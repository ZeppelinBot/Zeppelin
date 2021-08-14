import { Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { PingableRole } from "../../../data/entities/PingableRole";
import { PingableRolesPluginType } from "../types";

export function disablePingableRoles(
  pluginData: GuildPluginData<PingableRolesPluginType>,
  pingableRoles: PingableRole[],
) {
  for (const pingableRole of pingableRoles) {
    const role = pluginData.guild.roles.cache.get(pingableRole.role_id as Snowflake);
    if (!role) continue;

    role.edit(
      {
        mentionable: false,
      },
      "Disable pingable role",
    );
  }
}
