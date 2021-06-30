import { Snowflake, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { botControlCmd } from "../types";

export const LeaveServerCmd = botControlCmd({
  trigger: ["leave_server", "leave_guild"],
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

    const guildToLeave = await pluginData.client.guilds.fetch(args.guildId as Snowflake)!;
    const guildName = guildToLeave.name;

    try {
      await pluginData.client.guilds.cache.get(args.guildId as Snowflake)?.leave();
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, `Failed to leave guild: ${e.message}`);
      return;
    }

    sendSuccessMessage(pluginData, msg.channel as TextChannel, `Left guild **${guildName}**`);
  },
});
