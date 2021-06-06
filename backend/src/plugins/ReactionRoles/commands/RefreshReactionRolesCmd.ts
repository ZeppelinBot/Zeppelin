import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { reactionRolesCmd } from "../types";
import { refreshReactionRoles } from "../util/refreshReactionRoles";

export const RefreshReactionRolesCmd = reactionRolesCmd({
  trigger: "reaction_roles refresh",
  permission: "can_manage",

  signature: {
    message: ct.messageTarget(),
  },

  async run({ message: msg, args, pluginData }) {
    if (pluginData.state.pendingRefreshes.has(`${args.message.channel.id}-${args.message.messageId}`)) {
      sendErrorMessage(pluginData, msg.channel, "Another refresh in progress");
      return;
    }

    await refreshReactionRoles(pluginData, args.message.channel.id, args.message.messageId);

    sendSuccessMessage(pluginData, msg.channel, "Reaction roles refreshed");
  },
});
