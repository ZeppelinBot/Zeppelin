import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isStaffPreFilter } from "../../../pluginUtils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { botControlCmd } from "../types";

export const ReloadServerCmd = botControlCmd({
  trigger: ["reload_server", "reload_guild"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    guildId: ct.anyId(),
  },

  async run({ pluginData, message: msg, args }) {
    if (!pluginData.client.guilds.cache.has(args.guildId as Snowflake)) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "I am not in that guild");
      return;
    }

    try {
      await pluginData.getKnubInstance().reloadGuild(args.guildId);
    } catch (e) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `Failed to reload guild: ${e.message}`);
      return;
    }

    const guild = await pluginData.client.guilds.fetch(args.guildId as Snowflake);
    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(msg, `Reloaded guild **${guild?.name || "???"}**`);
  },
});
