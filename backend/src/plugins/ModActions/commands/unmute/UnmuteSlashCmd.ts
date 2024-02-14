import { slashOptions } from "knub";
import { canActOn, hasPermission, sendErrorMessage } from "../../../../pluginUtils";
import { convertDelayStringToMS, resolveMember } from "../../../../utils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction";
import { MutesPlugin } from "../../../Mutes/MutesPlugin";
import { actualUnmuteCmd } from "../../functions/actualCommands/actualUnmuteCmd";
import { isBanned } from "../../functions/isBanned";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";

const opts = [
  slashOptions.string({ name: "time", description: "The duration of the unmute", required: false }),
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to unmute as", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason of the unmute",
  }),
];

export const UnmuteSlashCmd = {
  name: "unmute",
  configPermission: "can_mute",
  description: "Unmute the specified member",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to unmute", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      sendErrorMessage(pluginData, interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

    const memberToUnmute = await resolveMember(pluginData.client, pluginData.guild, options.user.id);
    const mutesPlugin = pluginData.getPlugin(MutesPlugin);
    const hasMuteRole = memberToUnmute && mutesPlugin.hasMutedRole(memberToUnmute);

    // Check if they're muted in the first place
    if (
      !(await pluginData.state.mutes.isMuted(options.user.id)) &&
      !hasMuteRole &&
      !memberToUnmute?.isCommunicationDisabled()
    ) {
      sendErrorMessage(pluginData, interaction, "Cannot unmute: member is not muted");
      return;
    }

    if (!memberToUnmute) {
      const banned = await isBanned(pluginData, options.user.id);
      const prefix = pluginData.fullConfig.prefix;
      if (banned) {
        sendErrorMessage(
          pluginData,
          interaction,
          `User is banned. Use \`${prefix}forceunmute\` to unmute them anyway.`,
        );
        return;
      } else {
        // Ask the mod if we should upgrade to a forceunmute as the user is not on the server
        const reply = await waitForButtonConfirm(
          interaction,
          { content: "User not on server, forceunmute instead?" },
          { confirmText: "Yes", cancelText: "No", restrictToId: interaction.user.id },
        );

        if (!reply) {
          sendErrorMessage(pluginData, interaction, "User not on server, unmute cancelled by moderator");
          return;
        }
      }
    }

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !canActOn(pluginData, interaction.member, memberToUnmute)) {
      sendErrorMessage(pluginData, interaction, "Cannot unmute: insufficient permissions");
      return;
    }

    let mod = interaction.member;
    let ppId: string | undefined;
    const canActAsOther = await hasPermission(pluginData, "can_act_as_other", {
      channel: interaction.channel,
      member: interaction.member,
    });

    if (options.mod) {
      if (!canActAsOther) {
        sendErrorMessage(pluginData, interaction, "You don't have permission to act as another moderator");
        return;
      }

      mod = options.mod;
      ppId = interaction.user.id;
    }

    const convertedTime = options.time ? convertDelayStringToMS(options.time) : null;
    if (options.time && !convertedTime) {
      sendErrorMessage(pluginData, interaction, `Could not convert ${options.time} to a delay`);
      return;
    }

    actualUnmuteCmd(pluginData, interaction, options.user, attachments, mod, ppId, options.time, options.reason);
  },
};
