import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { GuildConfigReloaderPluginType } from "./types";
import { Configs } from "../../data/Configs";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds";
import * as t from "io-ts";

export const GuildConfigReloaderPlugin = zeppelinGlobalPlugin<GuildConfigReloaderPluginType>()({
  name: "guild_config_reloader",
  showInDocs: false,

  configSchema: t.type({}),

  async afterLoad(pluginData) {
    pluginData.state.guildConfigs = new Configs();
    pluginData.state.highestConfigId = await pluginData.state.guildConfigs.getHighestId();

    reloadChangedGuilds(pluginData);
  },

  beforeUnload(pluginData) {
    clearTimeout(pluginData.state.nextCheckTimeout);
    pluginData.state.unloaded = true;
  },
});
