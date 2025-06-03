import { ChannelType, GuildMember } from "discord.js";
import { slashOptions } from "knub";
import { hasPermission } from "../../../../pluginUtils.js";
import { UserNotificationMethod, convertDelayStringToMS, resolveMember } from "../../../../utils.js";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions.js";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs.js";
import { modActionsSlashCmd } from "../../types.js";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants.js";
import { actualMuteCmd } from "../mute/actualMuteCmd.js";

const opts = [
  slashOptions.string({ name: "time", description: "The duration of the mute", required: false }),
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to mute as", required: false }),
  slashOptions.string({
    name: "notify",
    description: "How to notify",
    required: false,
    choices: [
      { name: "DM", value: "dm" },
      { name: "Channel", value: "channel" },
    ],
  }),
  slashOptions.channel({
    name: "notify-channel",
    description: "The channel to notify in",
    channelTypes: [ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread],
    required: false,
  }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const ForceMuteSlashCmd = modActionsSlashCmd({
  name: "forcemute",
  configPermission: "can_mute",
  description: "Force-mute the specified user, even if they're not on the server",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to mute", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      pluginData.state.common.sendErrorMessage(interaction, "Text or attachment required", undefined, undefined, true);

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

    let contactMethods: UserNotificationMethod[] | undefined;
    try {
      contactMethods = readContactMethodsFromArgs(options) ?? undefined;
    } catch (e) {
      pluginData.state.common.sendErrorMessage(interaction, e.message);
      return;
    }

    actualMuteCmd(
      pluginData,
      interaction,
      options.user,
      attachments,
      mod,
      ppId,
      convertedTime,
      options.reason ?? "",
      contactMethods,
    );
  },
});
