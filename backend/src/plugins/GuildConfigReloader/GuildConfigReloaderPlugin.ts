import { globalPlugin } from "vety";
import { Configs } from "../../data/Configs.js";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds.js";
import { GuildConfigReloaderPluginType, zGuildConfigReloaderPluginConfig } from "./types.js";

export const GuildConfigReloaderPlugin = globalPlugin<GuildConfigReloaderPluginType>()({
  name: "guild_config_reloader",

  configSchema: zGuildConfigReloaderPluginConfig,

  async beforeLoad(pluginData) {
    const { state } = pluginData;

    state.guildConfigs = new Configs();
    state.highestConfigId = await state.guildConfigs.getHighestId();
  },

  afterLoad(pluginData) {
    reloadChangedGuilds(pluginData);
  },

  beforeUnload(pluginData) {
    clearTimeout(pluginData.state.nextCheckTimeout);
    pluginData.state.unloaded = true;
  },
});
