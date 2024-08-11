import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { isStaffPreFilter } from "../../../pluginUtils.js";
import { noop } from "../../../utils.js";
import { botControlCmd } from "../types.js";

export const DisallowServerCmd = botControlCmd({
  trigger: ["disallow_server", "disallowserver", "remove_server", "removeserver"],
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  signature: {
    guildId: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const existing = await pluginData.state.allowedGuilds.find(args.guildId);
    if (!existing) {
      void msg.channel.send("That server is not allowed in the first place!");
      return;
    }

    await pluginData.state.allowedGuilds.remove(args.guildId);
    await pluginData.client.guilds.cache
      .get(args.guildId as Snowflake)
      ?.leave()
      .catch(noop);
    void msg.channel.send("Server removed!");
  },
});
