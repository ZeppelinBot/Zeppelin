import { TextChannel } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveInvite, verboseUserMention } from "../../../utils";
import { botControlCmd } from "../types";

const REQUIRED_MEMBER_COUNT = 5000;

export const EligibleCmd = botControlCmd({
  trigger: ["eligible", "is_eligible", "iseligible"],
  permission: "can_eligible",

  signature: {
    user: ct.resolvedUser(),
    inviteCode: ct.string(),
  },

  async run({ pluginData, message: msg, args }) {
    if ((await pluginData.state.apiPermissionAssignments.getByUserId(args.user.id)).length) {
      sendSuccessMessage(
        pluginData,
        msg.channel as TextChannel,
        `${verboseUserMention(args.user)} is an existing bot operator. They are eligible!`,
      );
      return;
    }

    const invite = await resolveInvite(pluginData.client, args.inviteCode, true);
    if (!invite || !invite.guild) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Could not resolve server from invite");
      return;
    }

    if (invite.guild.features.includes("PARTNERED")) {
      sendSuccessMessage(pluginData, msg.channel as TextChannel, `Server is partnered. It is eligible!`);
      return;
    }

    if (invite.guild.features.includes("VERIFIED")) {
      sendSuccessMessage(pluginData, msg.channel as TextChannel, `Server is verified. It is eligible!`);
      return;
    }

    const memberCount = invite.memberCount || 0;
    if (memberCount >= REQUIRED_MEMBER_COUNT) {
      sendSuccessMessage(
        pluginData,
        msg.channel as TextChannel,
        `Server has ${memberCount} members, which is equal or higher than the required ${REQUIRED_MEMBER_COUNT}. It is eligible!`,
      );
      return;
    }

    sendErrorMessage(
      pluginData,
      msg.channel as TextChannel,
      `Server **${invite.guild.name}** (\`${invite.guild.id}\`) is not eligible`,
    );
  },
});
