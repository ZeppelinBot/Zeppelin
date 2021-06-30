import { Snowflake, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { botControlCmd } from "../types";

export const ReloadServerCmd = botControlCmd({
  trigger: ["reload_server", "reload_guild"],
  permission: null,
  config: {
    preFilters: [isOwnerPreFilter],
  },

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    if (!pluginData.client.guilds.cache.has(args.guildId as Snowflake)) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "I am not in that guild");
      return;
    }

    try {
      await pluginData.getKnubInstance().reloadGuild(args.guildId);
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, `Failed to reload guild: ${e.message}`);
      return;
    }

    const guild = await pluginData.client.guilds.fetch(args.guildId as Snowflake);
    sendSuccessMessage(pluginData, msg.channel as TextChannel, `Reloaded guild **${guild?.name || "???"}**`);
  },
});
