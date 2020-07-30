import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { PluginData } from "knub";
import { AllowedGuilds } from "src/data/AllowedGuilds";
import { GuildInfoSaverPluginType } from "./types";
import { MINUTES } from "src/utils";
import * as t from "io-ts";

export const GuildInfoSaverPlugin = zeppelinPlugin<GuildInfoSaverPluginType>()("guild_info_saver", {
  showInDocs: false,

  configSchema: t.type({}),

  onLoad(pluginData) {
    const { state, guild } = pluginData;

    state.allowedGuilds = new AllowedGuilds();

    updateGuildInfo(pluginData);
    state.updateInterval = setInterval(() => updateGuildInfo(pluginData), 60 * MINUTES);
  },
});

function updateGuildInfo(pluginData: PluginData<GuildInfoSaverPluginType>) {
  pluginData.state.allowedGuilds.updateInfo(
    pluginData.guild.id,
    pluginData.guild.name,
    pluginData.guild.iconURL,
    pluginData.guild.ownerID,
  );
}
