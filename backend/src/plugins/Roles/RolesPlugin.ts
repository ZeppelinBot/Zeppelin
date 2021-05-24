import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { PluginOptions } from "knub";
import { ConfigSchema, RolesPluginType } from "./types";
import { GuildLogs } from "../../data/GuildLogs";
import { AddRoleCmd } from "./commands/AddRoleCmd";
import { RemoveRoleCmd } from "./commands/RemoveRoleCmd";
import { MassAddRoleCmd } from "./commands/MassAddRoleCmd";
import { MassRemoveRoleCmd } from "./commands/MassRemoveRoleCmd";
import { trimPluginDescription } from "../../utils";

const defaultOptions: PluginOptions<RolesPluginType> = {
  config: {
    can_assign: false,
    can_mass_assign: false,
    assignable_roles: ["558037973581430785"],
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

export const RolesPlugin = zeppelinGuildPlugin<RolesPluginType>()({
  name: "roles",
  showInDocs: true,
  info: {
    prettyName: "Roles",
    description: trimPluginDescription(`
      Enables authorised users to add and remove whitelisted roles with a command.
    `),
  },

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    AddRoleCmd,
    RemoveRoleCmd,
    MassAddRoleCmd,
    MassRemoveRoleCmd,
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.logs = new GuildLogs(guild.id);
  },
});
