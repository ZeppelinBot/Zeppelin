import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { pingableRolesCmd } from "../types";

export const PingableRoleEnableCmd = pingableRolesCmd({
  trigger: "pingable_role",
  permission: "can_manage",

  signature: {
    channelId: ct.channelId(),
    role: ct.role(),
  },

  async run({ message: msg, args, pluginData }) {
    const existingPingableRole = await pluginData.state.pingableRoles.getByChannelAndRoleId(
      args.channelId,
      args.role.id,
    );
    if (existingPingableRole) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `**${args.role.name}** is already set as pingable in <#${args.channelId}>`,
      );
      return;
    }

    await pluginData.state.pingableRoles.add(args.channelId, args.role.id);
    pluginData.state.cache.delete(args.channelId);

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `**${args.role.name}** has been set as pingable in <#${args.channelId}>`,
    );
  },
});
