import { zeppelinPlugin } from "../ZeppelinPluginBlueprint";
import { BasePluginType, eventListener, PluginData } from "knub";
import * as t from "io-ts";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { Guild } from "eris";

interface GuildAccessMonitorPluginType extends BasePluginType {
  config: {};
  state: {
    allowedGuilds: AllowedGuilds;
  };
}

async function checkGuild(pluginData: PluginData<GuildAccessMonitorPluginType>, guild: Guild) {
  if (!(await pluginData.state.allowedGuilds.isAllowed(guild.id))) {
    console.log(`Non-allowed server ${guild.name} (${guild.id}), would leave`);
  }
}

/**
 * Global plugin to monitor if Zeppelin is invited to a non-whitelisted server, and leave it
 */
export const GuildAccessMonitorPlugin = zeppelinPlugin<GuildAccessMonitorPluginType>()("guild_access_monitor", {
  configSchema: t.type({}),

  events: [
    eventListener<GuildAccessMonitorPluginType>()("guildAvailable", ({ pluginData, args: { guild } }) => {
      checkGuild(pluginData, guild);
    }),
  ],

  onLoad(pluginData) {
    pluginData.state.allowedGuilds = new AllowedGuilds();

    for (const guild of pluginData.client.guilds.values()) {
      checkGuild(pluginData, guild);
    }
  },
});
