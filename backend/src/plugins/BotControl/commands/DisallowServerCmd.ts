import { Snowflake } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { isStaffPreFilter } from "../../../pluginUtils";
import { noop } from "../../../utils";
import { CommonPlugin } from "../../Common/CommonPlugin";
import { botControlCmd } from "../types";

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
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "That server is not allowed in the first place!");
      return;
    }

    await pluginData.state.allowedGuilds.remove(args.guildId);
    await pluginData.client.guilds.cache
      .get(args.guildId as Snowflake)
      ?.leave()
      .catch(noop);
    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(msg, "Server removed!");
  },
});
