import { reactionRolesCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { TextChannel } from "eris";

export const ClearReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles clear",
  permission: "can_manage",

  signature: {
    messageId: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const savedMessage = await pluginData.state.savedMessages.find(args.messageId);
    if (!savedMessage) {
      sendErrorMessage(pluginData, msg.channel, "Unknown message");
      return;
    }

    const existingReactionRoles = pluginData.state.reactionRoles.getForMessage(args.messageId);
    if (!existingReactionRoles) {
      sendErrorMessage(pluginData, msg.channel, "Message doesn't have reaction roles on it");
      return;
    }

    pluginData.state.reactionRoles.removeFromMessage(args.messageId);

    const channel = pluginData.guild.channels.get(savedMessage.channel_id) as TextChannel;
    const targetMessage = await channel.getMessage(savedMessage.id);
    await targetMessage.removeReactions();

    sendSuccessMessage(pluginData, msg.channel, "Reaction roles cleared");
  },
});
