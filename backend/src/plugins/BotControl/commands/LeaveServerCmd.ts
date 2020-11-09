import { botControlCmd } from "../types";
import { isOwnerPreFilter, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { commandTypeHelpers as ct } from "../../../commandTypes";

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
    if (!pluginData.client.guilds.has(args.guildId)) {
      sendErrorMessage(pluginData, msg.channel, "I am not in that guild");
      return;
    }

    const guildToLeave = pluginData.client.guilds.get(args.guildId)!;
    const guildName = guildToLeave.name;

    try {
      await pluginData.client.leaveGuild(args.guildId);
    } catch (e) {
      sendErrorMessage(pluginData, msg.channel, `Failed to leave guild: ${e.message}`);
      return;
    }

    sendSuccessMessage(pluginData, msg.channel, `Left guild **${guildName}**`);
  },
});
