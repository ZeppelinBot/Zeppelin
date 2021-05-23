import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { GuildPluginData } from "knub";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { GuildInfoSaverPluginType } from "./types";
import { MINUTES } from "../../utils";
import * as t from "io-ts";

export const GuildInfoSaverPlugin = zeppelinGuildPlugin<GuildInfoSaverPluginType>()({
  name: "guild_info_saver",
  showInDocs: false,

  configSchema: t.type({}),

  afterLoad(pluginData) {
    const { state, guild } = pluginData;

    state.allowedGuilds = new AllowedGuilds();

    updateGuildInfo(pluginData);
    state.updateInterval = setInterval(() => updateGuildInfo(pluginData), 60 * MINUTES);
  },
});

function updateGuildInfo(pluginData: GuildPluginData<GuildInfoSaverPluginType>) {
  pluginData.state.allowedGuilds.updateInfo(
    pluginData.guild.id,
    pluginData.guild.name,
    pluginData.guild.iconURL,
    pluginData.guild.ownerID,
  );
}
