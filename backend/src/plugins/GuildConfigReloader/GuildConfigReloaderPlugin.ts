import * as t from "io-ts";
import { Configs } from "../../data/Configs";
import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds";
import { GuildConfigReloaderPluginType } from "./types";

export const GuildConfigReloaderPlugin = zeppelinGlobalPlugin<GuildConfigReloaderPluginType>()({
  name: "guild_config_reloader",
  showInDocs: false,

  configSchema: t.type({}),

  async beforeLoad(pluginData) {
    pluginData.state.guildConfigs = new Configs();
    pluginData.state.highestConfigId = await pluginData.state.guildConfigs.getHighestId();
  },

  afterLoad(pluginData) {
    reloadChangedGuilds(pluginData);
  },

  beforeUnload(pluginData) {
    clearTimeout(pluginData.state.nextCheckTimeout);
    pluginData.state.unloaded = true;
  },
});
