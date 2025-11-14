import { guildPlugin } from "vety";
import { GuildLogs } from "../../data/GuildLogs.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { LogsPlugin } from "../Logs/LogsPlugin.js";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin.js";
import { AddRoleCmd } from "./commands/AddRoleCmd.js";
import { MassAddRoleCmd } from "./commands/MassAddRoleCmd.js";
import { MassRemoveRoleCmd } from "./commands/MassRemoveRoleCmd.js";
import { RemoveRoleCmd } from "./commands/RemoveRoleCmd.js";
import { RolesPluginType, zRolesConfig } from "./types.js";

export const RolesPlugin = guildPlugin<RolesPluginType>()({
  name: "roles",

  dependencies: () => [LogsPlugin, RoleManagerPlugin],
  configSchema: zRolesConfig,
  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_assign: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_mass_assign: true,
      },
    },
  ],

  // prettier-ignore
  messageCommands: [
    AddRoleCmd,
    RemoveRoleCmd,
    MassAddRoleCmd,
    MassRemoveRoleCmd,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },
});
