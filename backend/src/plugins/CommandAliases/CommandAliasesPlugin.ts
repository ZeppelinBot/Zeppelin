import { guildPlugin } from "vety";
import { DispatchAliasEvt } from "./events/DispatchAliasEvt.js";
import { CommandAliasesPluginType, zCommandAliasesConfig } from "./types.js";
import { normalizeAliases } from "./functions/normalizeAliases.js";
import { buildAliasMatchers } from "./functions/buildAliasMatchers.js";
import { getGuildPrefix } from "../../utils/getGuildPrefix.js";

export const CommandAliasesPlugin = guildPlugin<CommandAliasesPluginType>()({
  name: "command_aliases",
  configSchema: zCommandAliasesConfig,

  beforeLoad(pluginData) {
    const prefix = getGuildPrefix(pluginData);
    const config = pluginData.config.get();
    const normalizedAliases = normalizeAliases(config.aliases);

    pluginData.state.matchers = buildAliasMatchers(prefix, normalizedAliases);
  },

  events: [DispatchAliasEvt],
});
