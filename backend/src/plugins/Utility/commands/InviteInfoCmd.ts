import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { parseInviteCodeInput } from "../../../utils.js";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed.js";
import { utilityCmd } from "../types.js";

export const InviteInfoCmd = utilityCmd({
  trigger: ["invite", "inviteinfo"],
  description: "Show information about an invite",
  usage: "!invite overwatch",
  permission: "can_inviteinfo",

  signature: {
    inviteCode: ct.string(),
  },

  async run({ message, args, pluginData }) {
    const inviteCode = parseInviteCodeInput(args.inviteCode);
    const embed = await getInviteInfoEmbed(pluginData, inviteCode);
    if (!embed) {
      void pluginData.state.common.sendErrorMessage(message, "Unknown invite");
      return;
    }

    message.channel.send({ embeds: [embed] });
  },
});
