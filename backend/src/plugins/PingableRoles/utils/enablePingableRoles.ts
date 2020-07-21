import { PingableRole } from "src/data/entities/PingableRole";
import { PluginData } from "knub";
import { PingableRolesPluginType } from "../types";

export function enablePingableRoles(pluginData: PluginData<PingableRolesPluginType>, pingableRoles: PingableRole[]) {
  for (const pingableRole of pingableRoles) {
    const role = pluginData.guild.roles.get(pingableRole.role_id);
    if (!role) continue;

    role.edit(
      {
        mentionable: true,
      },
      "Enable pingable role",
    );
  }
}
