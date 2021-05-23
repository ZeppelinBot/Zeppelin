import { PluginOptions } from "knub";
import { ConfigSchema, PingableRolesPluginType } from "./types";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { PingableRoleEnableCmd } from "./commands/PingableRoleEnableCmd";
import { PingableRoleDisableCmd } from "./commands/PingableRoleDisableCmd";
import { MessageCreateDisablePingableEvt, TypingEnablePingableEvt } from "./events/ChangePingableEvts";

const defaultOptions: PluginOptions<PingableRolesPluginType> = {
  config: {
    can_manage: false,
  },
  overrides: [
    {
      level: ">=100",
      config: {
        can_manage: true,
      },
    },
  ],
};

export const PingableRolesPlugin = zeppelinGuildPlugin<PingableRolesPluginType>()({
  name: "pingable_roles",
  showInDocs: true,
  info: {
    prettyName: "Pingable roles",
  },

  configSchema: ConfigSchema,
  defaultOptions,

  // prettier-ignore
  commands: [
    PingableRoleEnableCmd,
    PingableRoleDisableCmd,
  ],

  // prettier-ignore
  events: [
    TypingEnablePingableEvt,
    MessageCreateDisablePingableEvt,
  ],

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.pingableRoles = GuildPingableRoles.getGuildInstance(guild.id);
    state.cache = new Map();
    state.timeouts = new Map();
  },
});
