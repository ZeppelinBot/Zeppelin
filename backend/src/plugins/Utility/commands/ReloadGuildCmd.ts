import { TextChannel } from "discord.js";
import { activeReloads } from "../guildReloads";
import { utilityCmd } from "../types";

export const ReloadGuildCmd = utilityCmd({
  trigger: "reload_guild",
  description: "Reload the Zeppelin configuration and all plugins for the server. This can sometimes fix issues.",
  permission: "can_reload_guild",

  async run({ message: msg, args, pluginData }) {
    if (activeReloads.has(pluginData.guild.id)) return;
    activeReloads.set(pluginData.guild.id, msg.channel as TextChannel);

    msg.channel.send("Reloading...");
    pluginData.getKnubInstance().reloadGuild(pluginData.guild.id);
  },
});
