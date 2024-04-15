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
      void msg.channel.send("I am not in that guild");
      return;
    }

    try {
      await pluginData.getKnubInstance().reloadGuild(args.guildId);
    } catch (e) {
      void msg.channel.send(`Failed to reload guild: ${e.message}`);
      return;
    }

    const guild = await pluginData.client.guilds.fetch(args.guildId as Snowflake);
    void msg.channel.send(`Reloaded guild **${guild?.name || "???"}**`);
  },
});
