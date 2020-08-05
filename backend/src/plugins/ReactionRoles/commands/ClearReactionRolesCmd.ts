import { reactionRolesCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { TextChannel } from "eris";

export const ClearReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles clear",
  permission: "can_manage",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message: msg, args, pluginData }) {
    const existingReactionRoles = pluginData.state.reactionRoles.getForMessage(args.message.messageId);
    if (!existingReactionRoles) {
      sendErrorMessage(pluginData, msg.channel, "Message doesn't have reaction roles on it");
      return;
    }

    pluginData.state.reactionRoles.removeFromMessage(args.message.messageId);

    const targetMessage = await args.message.channel.getMessage(args.message.messageId);
    await targetMessage.removeReactions();

    sendSuccessMessage(pluginData, msg.channel, "Reaction roles cleared");
  },
});
