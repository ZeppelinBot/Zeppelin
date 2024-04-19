import { globalPlugin } from "knub";
import z from "zod";
import { Configs } from "../../data/Configs";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds";
import { GuildConfigReloaderPluginType } from "./types";

export const GuildConfigReloaderPlugin = globalPlugin<GuildConfigReloaderPluginType>()({
  name: "guild_config_reloader",

  configParser: (input) => z.strictObject({}).parse(input),

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
