import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { pingableRolesCmd } from "../types";

export const PingableRoleDisableCmd = pingableRolesCmd({
  trigger: ["pingable_role disable", "pingable_role d"],
  permission: "can_manage",

  signature: {
    channelId: ct.channelId(),
    role: ct.role(),
  },

  async run({ message: msg, args, pluginData }) {
    const pingableRole = await pluginData.state.pingableRoles.getByChannelAndRoleId(args.channelId, args.role.id);
    if (!pingableRole) {
      sendErrorMessage(pluginData, msg.channel, `**${args.role.name}** is not set as pingable in <#${args.channelId}>`);
      return;
    }

    await pluginData.state.pingableRoles.delete(args.channelId, args.role.id);
    pluginData.state.cache.delete(args.channelId);

    sendSuccessMessage(
      pluginData,
      msg.channel,
      `**${args.role.name}** is no longer set as pingable in <#${args.channelId}>`,
    );
  },
});
