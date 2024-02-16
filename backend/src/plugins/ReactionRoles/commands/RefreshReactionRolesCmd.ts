import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CommonPlugin } from "../../Common/CommonPlugin";
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
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Another refresh in progress");
      return;
    }

    await refreshReactionRoles(pluginData, args.message.channel.id, args.message.messageId);

    pluginData.getPlugin(CommonPlugin).sendSuccessMessage(msg, "Reaction roles refreshed");
  },
});
