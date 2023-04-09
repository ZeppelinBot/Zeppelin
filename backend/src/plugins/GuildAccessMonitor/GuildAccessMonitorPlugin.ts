import { Guild } from "discord.js";
import * as t from "io-ts";
import { BasePluginType, GlobalPluginData, globalPluginEventListener } from "knub";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { Configs } from "../../data/Configs";
import { env } from "../../env";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { zeppelinGlobalPlugin } from "../ZeppelinPluginBlueprint";

interface GuildAccessMonitorPluginType extends BasePluginType {
  config: {};
  state: {
    allowedGuilds: AllowedGuilds;
  };
}

async function checkGuild(pluginData: GlobalPluginData<GuildAccessMonitorPluginType>, guild: Guild) {
  if (!(await pluginData.state.allowedGuilds.isAllowed(guild.id))) {
    // tslint:disable-next-line:no-console
    console.log(`Non-allowed server ${guild.name} (${guild.id}), leaving`);
    // guild.leave();
  }
}

/**
 * Global plugin to monitor if Zeppelin is invited to a non-whitelisted server, and leave it
 */
export const GuildAccessMonitorPlugin = zeppelinGlobalPlugin<GuildAccessMonitorPluginType>()({
  name: "guild_access_monitor",
  configParser: makeIoTsConfigParser(t.type({})),

  events: [
    globalPluginEventListener<GuildAccessMonitorPluginType>()({
      event: "guildCreate",
      listener({ pluginData, args: { guild } }) {
        checkGuild(pluginData, guild);
      },
    }),
  ],

  async beforeLoad(pluginData) {
    const { state } = pluginData;

    state.allowedGuilds = new AllowedGuilds();

    const defaultAllowedServers = env.DEFAULT_ALLOWED_SERVERS || [];
    const configs = new Configs();
    for (const serverId of defaultAllowedServers) {
      if (!(await state.allowedGuilds.isAllowed(serverId))) {
        // tslint:disable-next-line:no-console
        console.log(`Adding allowed-by-default server ${serverId} to the allowed servers`);
        await state.allowedGuilds.add(serverId);
        await configs.saveNewRevision(`guild-${serverId}`, "plugins: {}", 0);
      }
    }
  },

  afterLoad(pluginData) {
    for (const guild of pluginData.client.guilds.cache.values()) {
      checkGuild(pluginData, guild);
    }
  },
});
