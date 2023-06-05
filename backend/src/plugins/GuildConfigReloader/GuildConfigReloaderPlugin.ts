import * as t from "io-ts";
import { Configs } from "../../data/Configs";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds";
import { GuildConfigReloaderPluginType } from "./types";

export const GuildConfigReloaderPlugin = zeppelinGlobalPlugin<GuildConfigReloaderPluginType>()({
  name: "guild_config_reloader",
  showInDocs: false,

  configParser: makeIoTsConfigParser(t.type({})),

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
