import { Guild } from "discord.js";
import * as t from "io-ts";
import { guildPluginEventListener } from "knub";
import { AllowedGuilds } from "../../data/AllowedGuilds";
import { ApiPermissionAssignments } from "../../data/ApiPermissionAssignments";
import { makeIoTsConfigParser } from "../../pluginUtils";
import { MINUTES } from "../../utils";
import { zeppelinGuildPlugin } from "../ZeppelinPluginBlueprint";
import { GuildInfoSaverPluginType } from "./types";

export const GuildInfoSaverPlugin = zeppelinGuildPlugin<GuildInfoSaverPluginType>()({
  name: "guild_info_saver",
  showInDocs: false,

  configParser: makeIoTsConfigParser(t.type({})),

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
