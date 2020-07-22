import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { GuildConfigReloaderPluginType } from "./types";
import { Configs } from "../../data/Configs";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds";

export const GuildConfigReloaderPlugin = zeppelinPlugin<GuildConfigReloaderPluginType>()("guild_config_reloader", {
  async onLoad(pluginData) {
    pluginData.state.guildConfigs = new Configs();
    pluginData.state.highestConfigId = await pluginData.state.guildConfigs.getHighestId();

    reloadChangedGuilds(pluginData);
  },

  onUnload(pluginData) {
    clearTimeout(pluginData.state.nextCheckTimeout);
    pluginData.state.unloaded = true;
  },
});
