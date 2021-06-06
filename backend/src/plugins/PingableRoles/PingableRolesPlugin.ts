import { PluginOptions } from "knub";
import { GuildPingableRoles } from "../../data/GuildPingableRoles";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { PingableRoleDisableCmd } from "./commands/PingableRoleDisableCmd";
import { PingableRoleEnableCmd } from "./commands/PingableRoleEnableCmd";
import { MessageCreateDisablePingableEvt, TypingEnablePingableEvt } from "./events/ChangePingableEvts";
import { ConfigSchema, PingableRolesPluginType } from "./types";

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

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;

    state.pingableRoles = GuildPingableRoles.getGuildInstance(guild.id);
    state.cache = new Map();
    state.timeouts = new Map();
  },
});
