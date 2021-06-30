import { Snowflake, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { noop } from "../../../utils";
import { botControlCmd } from "../types";

export const DisallowServerCmd = botControlCmd({
  trigger: ["disallow_server", "disallowserver", "remove_server", "removeserver"],
  permission: null,
  config: {
    preFilters: [isOwnerPreFilter],
  },

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const existing = await pluginData.state.allowedGuilds.find(args.guildId);
    if (!existing) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "That server is not allowed in the first place!");
      return;
    }

    await pluginData.state.allowedGuilds.remove(args.guildId);
    await pluginData.client.guilds.cache
      .get(args.guildId as Snowflake)
      ?.leave()
      .catch(noop);
    sendSuccessMessage(pluginData, msg.channel as TextChannel, "Server removed!");
  },
});
