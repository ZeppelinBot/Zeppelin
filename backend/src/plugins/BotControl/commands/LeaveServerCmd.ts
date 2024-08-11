import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { isStaffPreFilter } from "../../../pluginUtils.js";
import { botControlCmd } from "../types.js";

export const LeaveServerCmd = botControlCmd({
  trigger: ["leave_server", "leave_guild"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    if (!pluginData.client.guilds.cache.has(args.guildId as Snowflake)) {
      void msg.channel.send("I am not in that guild");
      return;
    }

    const guildToLeave = await pluginData.client.guilds.fetch(args.guildId as Snowflake)!;
    const guildName = guildToLeave.name;

    try {
      await pluginData.client.guilds.cache.get(args.guildId as Snowflake)?.leave();
    } catch (e) {
      void msg.channel.send(`Failed to leave guild: ${e.message}`);
      return;
    }

    void msg.channel.send(`Left guild **${guildName}**`);
  },
});
