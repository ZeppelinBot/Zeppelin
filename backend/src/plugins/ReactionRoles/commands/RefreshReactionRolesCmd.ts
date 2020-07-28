import { reactionRolesCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "src/pluginUtils";
import { refreshReactionRoles } from "../util/refreshReactionRoles";

export const RefreshReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles refresh",
  permission: "can_manage",

  signature: {
    messageId: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const savedMessage = await pluginData.state.savedMessages.find(args.messageId);
    if (!savedMessage) {
      console.log("ah");
      sendErrorMessage(pluginData, msg.channel, "Unknown message");
      return;
    }

    if (pluginData.state.pendingRefreshes.has(`${savedMessage.channel_id}-${savedMessage.id}`)) {
      sendErrorMessage(pluginData, msg.channel, "Another refresh in progress");
      return;
    }

    await refreshReactionRoles(pluginData, savedMessage.channel_id, savedMessage.id);

    sendSuccessMessage(pluginData, msg.channel, "Reaction roles refreshed");
  },
});
