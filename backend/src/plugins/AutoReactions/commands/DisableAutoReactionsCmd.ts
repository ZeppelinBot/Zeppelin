import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { autoReactionsCmd } from "../types";

export const DisableAutoReactionsCmd = autoReactionsCmd({
  trigger: "auto_reactions disable",
  permission: "can_manage",
  usage: "!auto_reactions disable 629990160477585428",

  signature: {
    channelId: ct.channelId(),
  },

  async run({ message: msg, args, pluginData }) {
    const autoReaction = await pluginData.state.autoReactions.getForChannel(args.channelId);
    if (!autoReaction) {
      sendErrorMessage(pluginData, msg.channel, `Auto-reactions aren't enabled in <#${args.channelId}>`);
      return;
    }

    await pluginData.state.autoReactions.removeFromChannel(args.channelId);
    sendSuccessMessage(pluginData, msg.channel, `Auto-reactions disabled in <#${args.channelId}>`);
  },
});
