import { PluginOptions, guildPlugin } from "knub";
import { GuildLogs } from "../../data/GuildLogs";
import { LogsPlugin } from "../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../RoleManager/RoleManagerPlugin";
import { AddRoleCmd } from "./commands/AddRoleCmd";
import { MassAddRoleCmd } from "./commands/MassAddRoleCmd";
import { MassRemoveRoleCmd } from "./commands/MassRemoveRoleCmd";
import { RemoveRoleCmd } from "./commands/RemoveRoleCmd";
import { RolesPluginType, zRolesConfig } from "./types";
import { CommonPlugin } from "../Common/CommonPlugin";

const defaultOptions: PluginOptions<RolesPluginType> = {
  config: {
    can_assign: false,
    can_mass_assign: false,
    assignable_roles: [],
  },
  overrides: [
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
};

export const RolesPlugin = guildPlugin<RolesPluginType>()({
  name: "roles",

  dependencies: () => [LogsPlugin, RoleManagerPlugin],
  configParser: (input) => zRolesConfig.parse(input),
  defaultOptions,

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
