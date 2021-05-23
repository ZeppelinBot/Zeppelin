import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";
import { BasePluginType, typedGlobalEventListener, GlobalPluginData } from "knub";
import * as t from "io-ts";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { Guild } from "eris";

interface GuildAccessMonitorPluginType extends BasePluginType {
  config: {};
  state: {
    allowedGuilds: AllowedGuilds;
  };
}

async function checkGuild(pluginData: GlobalPluginData<GuildAccessMonitorPluginType>, guild: Guild) {
  if (!(await pluginData.state.allowedGuilds.isAllowed(guild.id))) {
    console.log(`Non-allowed server ${guild.name} (${guild.id}), leaving`);
    console.log("[Temporarily not leaving automatically]");
    // guild.leave();
  }
}

/**
 * Global plugin to monitor if Zeppelin is invited to a non-whitelisted server, and leave it
 */
export const GuildAccessMonitorPlugin = zeppelinGlobalPlugin<GuildAccessMonitorPluginType>()({
  name: "guild_access_monitor",
  configSchema: t.type({}),

  events: [
    typedGlobalEventListener<GuildAccessMonitorPluginType>()({
      event: "guildAvailable",
      listener({ pluginData, args: { guild } }) {
        checkGuild(pluginData, guild);
      },
    }),
  ],

  beforeLoad(pluginData) {
    pluginData.state.allowedGuilds = new AllowedGuilds();
  },

  afterLoad(pluginData) {
    for (const guild of pluginData.client.guilds.values()) {
      checkGuild(pluginData, guild);
    }
  },
});
