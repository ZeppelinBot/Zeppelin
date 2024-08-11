import { commandTypeHelpers as ct } from "../../../commandTypes.js";
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
      void pluginData.state.common.sendErrorMessage(msg, "Another refresh in progress");
      return;
    }

    await refreshReactionRoles(pluginData, args.message.channel.id, args.message.messageId);

    void pluginData.state.common.sendSuccessMessage(msg, "Reaction roles refreshed");
  },
});
