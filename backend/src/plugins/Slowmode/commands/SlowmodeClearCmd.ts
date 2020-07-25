import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { slowmodeCmd } from "../types";
import { clearBotSlowmodeFromUserId } from "../util/clearBotSlowmodeFromUserId";

export const SlowmodeClearCmd = slowmodeCmd({
  trigger: ["slowmode clear", "slowmode c"],
  permission: "can_manage",

  signature: {
    channel: ct.textChannel(),
    user: ct.resolvedUserLoose(),

    force: ct.bool({ option: true, isSwitch: true }),
  },

  async run({ message: msg, args, pluginData }) {
    const channelSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(args.channel.id);
    if (!channelSlowmode) {
      sendErrorMessage(pluginData, msg.channel, "Channel doesn't have slowmode!");
      return;
    }

    try {
      await clearBotSlowmodeFromUserId(pluginData, args.channel, args.user.id, args.force);
    } catch (e) {
      return sendErrorMessage(
        pluginData,
        msg.channel,
        `Failed to clear slowmode from **${args.user.username}#${args.user.discriminator}** in <#${args.channel.id}>`,
      );
    }

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Slowmode cleared from **${args.user.username}#${args.user.discriminator}** in <#${args.channel.id}>`,
    );
  },
});
