import { GuildMember } from "discord.js";
import { slashOptions } from "vety";
import { canActOn, hasPermission } from "../../../../pluginUtils.js";
import { convertDelayStringToMS, resolveMember } from "../../../../utils.js";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions.js";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction.js";
import { MutesPlugin } from "../../../Mutes/MutesPlugin.js";
import { isBanned } from "../../functions/isBanned.js";
import { modActionsSlashCmd } from "../../types.js";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants.js";
import { actualUnmuteCmd } from "./actualUnmuteCmd.js";

const opts = [
  slashOptions.string({ name: "time", description: "The duration of the unmute", required: false }),
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to unmute as", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const UnmuteSlashCmd = modActionsSlashCmd({
  name: "unmute",
  configPermission: "can_mute",
  description: "Unmute the specified member",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to unmute", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      pluginData.state.common.sendErrorMessage(interaction, "Text or attachment required", undefined, undefined, true);

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
      pluginData.state.common.sendErrorMessage(interaction, "Cannot unmute: member is not muted");
      return;
    }

    if (!memberToUnmute) {
      const banned = await isBanned(pluginData, options.user.id);
      const prefix = pluginData.fullConfig.prefix;
      if (banned) {
        pluginData.state.common.sendErrorMessage(
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
          pluginData.state.common.sendErrorMessage(interaction, "User not on server, unmute cancelled by moderator");
          return;
        }
      }
    }

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !canActOn(pluginData, interaction.member as GuildMember, memberToUnmute)) {
      pluginData.state.common.sendErrorMessage(interaction, "Cannot unmute: insufficient permissions");
      return;
    }

    let mod = interaction.member as GuildMember;
    let ppId: string | undefined;
    const canActAsOther = await hasPermission(pluginData, "can_act_as_other", {
      channel: interaction.channel,
      member: interaction.member,
    });

    if (options.mod) {
      if (!canActAsOther) {
        pluginData.state.common.sendErrorMessage(interaction, "You don't have permission to act as another moderator");
        return;
      }

      mod = (await resolveMember(pluginData.client, pluginData.guild, options.mod.id))!;
      ppId = interaction.user.id;
    }

    const convertedTime = options.time ? (convertDelayStringToMS(options.time) ?? undefined) : undefined;
    if (options.time && !convertedTime) {
      pluginData.state.common.sendErrorMessage(interaction, `Could not convert ${options.time} to a delay`);
      return;
    }

    actualUnmuteCmd(pluginData, interaction, options.user, attachments, mod, ppId, convertedTime, options.reason);
  },
});
