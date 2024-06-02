import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils.js";
import { reactionRolesCmd } from "../types.js";
import { refreshReactionRoles } from "../util/refreshReactionRoles.js";

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
