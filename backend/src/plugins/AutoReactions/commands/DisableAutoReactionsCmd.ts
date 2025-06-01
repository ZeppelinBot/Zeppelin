import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { autoReactionsCmd } from "../types.js";

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
      void pluginData.state.common.sendErrorMessage(msg, `Auto-reactions aren't enabled in <#${args.channelId}>`);
      return;
    }

    await pluginData.state.autoReactions.removeFromChannel(args.channelId);
    pluginData.state.cache.delete(args.channelId);
    void pluginData.state.common.sendSuccessMessage(msg, `Auto-reactions disabled in <#${args.channelId}>`);
  },
});
