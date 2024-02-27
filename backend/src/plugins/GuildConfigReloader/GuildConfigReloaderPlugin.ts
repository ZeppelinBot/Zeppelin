import z from "zod";
import { Configs } from "../../data/Configs";
import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds";
import { GuildConfigReloaderPluginType } from "./types";

export const GuildConfigReloaderPlugin = zeppelinGlobalPlugin<GuildConfigReloaderPluginType>()({
  name: "guild_config_reloader",
  showInDocs: false,

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
