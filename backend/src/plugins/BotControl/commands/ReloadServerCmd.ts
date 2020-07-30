import { command } from "knub";
import { BotControlPluginType } from "../types";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";

export const ReloadServerCmd = command<BotControlPluginType>()({
  trigger: ["reload_server", "reload_guild"],
  permission: null,
  config: {
    preFilters: [isOwnerPreFilter],
  },

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    if (!pluginData.client.guilds.has(args.guildId)) {
      sendErrorMessage(pluginData, msg.channel, "I am not in that guild");
      return;
    }

    try {
      await pluginData.getKnubInstance().reloadGuild(args.guildId);
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, `Failed to reload guild: ${e.message}`);
      return;
    }

    const guild = pluginData.client.guilds.get(args.guildId);
    sendSuccessMessage(pluginData, msg.channel, `Reloaded guild **${guild?.name || "???"}**`);
  },
});
