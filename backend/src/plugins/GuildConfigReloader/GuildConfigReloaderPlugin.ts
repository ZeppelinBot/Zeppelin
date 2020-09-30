import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { GuildConfigReloaderPluginType } from "./types";
import { Configs } from "../../data/Configs";
import { reloadChangedGuilds } from "./functions/reloadChangedGuilds";
import * as t from "io-ts";

export const GuildConfigReloaderPlugin = zeppelinGlobalPlugin<GuildConfigReloaderPluginType>()(
  "guild_config_reloader",
  {
    showInDocs: false,

    configSchema: t.type({}),

    async onLoad(pluginData) {
      pluginData.state.guildConfigs = new Configs();
      pluginData.state.highestConfigId = await pluginData.state.guildConfigs.getHighestId();

      reloadChangedGuilds(pluginData);
    },

    onUnload(pluginData) {
      clearTimeout(pluginData.state.nextCheckTimeout);
      pluginData.state.unloaded = true;
    },
  },
);
