import { Guild, TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { GuildInvite, isGuildInvite, resolveInvite, verboseUserMention } from "../../../utils";
import { botControlCmd } from "../types";
import { isEligible } from "../functions/isEligible";

export const EligibleCmd = botControlCmd({
  trigger: ["eligible", "is_eligible", "iseligible"],
  permission: "can_eligible",

  signature: {
    user: ct.resolvedUser(),
    inviteCode: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    const invite = await resolveInvite(pluginData.client, args.inviteCode, true);
    if (!invite || !isGuildInvite(invite)) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Could not resolve invite");
      return;
    }

    const { result, explanation } = await isEligible(pluginData, args.user, invite);

    if (result) {
      sendSuccessMessage(pluginData, msg.channel as TextChannel, `Server is eligible: ${explanation}`);
      return;
    }

    sendErrorMessage(pluginData, msg.channel as TextChannel, `Server is **NOT** eligible: ${explanation}`);
  },
});
