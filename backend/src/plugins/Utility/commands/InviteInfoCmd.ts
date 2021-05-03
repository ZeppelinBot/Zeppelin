import { utilityCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage } from "../../../pluginUtils";
import { getInviteInfoEmbed } from "../functions/getInviteInfoEmbed";
import { parseInviteCodeInput } from "../../../utils";

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
      sendErrorMessage(pluginData, message.channel, "Unknown invite");
      return;
    }

    message.channel.createMessage({ embed });
  },
});
