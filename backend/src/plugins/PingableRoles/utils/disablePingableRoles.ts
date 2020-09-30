import { PingableRole } from "../../../data/entities/PingableRole";
import { GuildPluginData } from "knub";
import { PingableRolesPluginType } from "../types";

export function disablePingableRoles(
  pluginData: GuildPluginData<PingableRolesPluginType>,
  pingableRoles: PingableRole[],
) {
  for (const pingableRole of pingableRoles) {
    const role = pluginData.guild.roles.get(pingableRole.role_id);
    if (!role) continue;

    role.edit(
      {
        mentionable: false,
      },
      "Disable pingable role",
    );
  }
}
