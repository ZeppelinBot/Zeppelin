import { Guild } from "discord.js";
import { guildPlugin, guildPluginEventListener } from "vety";
import { AllowedGuilds } from "../../data/AllowedGuilds.js";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments.js";
import { MINUTES } from "../../utils.js";
import { GuildInfoSaverPluginType, zGuildInfoSaverConfig } from "./types.js";

export const GuildInfoSaverPlugin = guildPlugin<GuildInfoSaverPluginType>()({
  name: "guild_info_saver",

  configSchema: zGuildInfoSaverConfig,

  events: [
    guildPluginEventListener({
      event: "guildUpdate",
      listener({ args }) {
        void updateGuildInfo(args.newGuild);
      },
    }),
  ],

  afterLoad(pluginData) {
    void updateGuildInfo(pluginData.guild);
    pluginData.state.updateInterval = setInterval(() => updateGuildInfo(pluginData.guild), 60 * MINUTES);
  },

  beforeUnload(pluginData) {
    clearInterval(pluginData.state.updateInterval);
  },
});

async function updateGuildInfo(guild: Guild) {
  if (!guild.name) {
    return;
  }

  const allowedGuilds = new AllowedGuilds();
  const existingData = (await allowedGuilds.find(guild.id))!;
  allowedGuilds.updateInfo(guild.id, guild.name, guild.iconURL(), guild.ownerId);

  if (existingData.owner_id !== guild.ownerId || existingData.created_at === existingData.updated_at) {
    const apiPermissions = new ApiPermissionAssignments();
    apiPermissions.applyOwnerChange(guild.id, guild.ownerId);
  }
}
