import { PluginOptions } from "knub";
import { ConfigSchema, PingableRolesPluginType } from "./types";
import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { GuildPingableRoles } from "src/data/GuildPingableRoles";
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

export const PingableRolesPlugin = zeppelinPlugin<PingableRolesPluginType>()("pingable_roles", {
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

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.pingableRoles = GuildPingableRoles.getGuildInstance(guild.id);
    state.cache = new Map();
    state.timeouts = new Map();
  },
});
