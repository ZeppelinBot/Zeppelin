import { botControlCmd } from "../types";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { noop } from "../../../utils";

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
      sendErrorMessage(pluginData, msg.channel, "That server is not allowed in the first place!");
      return;
    }

    await pluginData.state.allowedGuilds.remove(args.guildId);
    await pluginData.client.leaveGuild(args.guildId).catch(noop);
    sendSuccessMessage(pluginData, msg.channel, "Server removed!");
  },
});
