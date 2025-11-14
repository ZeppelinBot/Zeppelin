import { ChannelType, GuildMember } from "discord.js";
import { slashOptions } from "vety";
import { hasPermission } from "../../../../pluginUtils.js";
import { UserNotificationMethod, convertDelayStringToMS, resolveMember } from "../../../../utils.js";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions.js";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs.js";
import { modActionsSlashCmd } from "../../types.js";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants.js";
import { actualBanCmd } from "./actualBanCmd.js";

const opts = [
  slashOptions.string({ name: "time", description: "The duration of the ban", required: false }),
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to ban as", required: false }),
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
  slashOptions.number({
    name: "delete-days",
    description: "The number of days of messages to delete",
    required: false,
  }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const BanSlashCmd = modActionsSlashCmd({
  name: "ban",
  configPermission: "can_ban",
  description: "Ban or Tempban the specified member",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to ban", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    let mod = interaction.member as GuildMember;
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
    }

    let contactMethods: UserNotificationMethod[] | undefined;
    try {
      contactMethods = readContactMethodsFromArgs(options) ?? undefined;
    } catch (e) {
      pluginData.state.common.sendErrorMessage(interaction, e.message);
      return;
    }

    const convertedTime = options.time ? convertDelayStringToMS(options.time) : null;
    if (options.time && !convertedTime) {
      pluginData.state.common.sendErrorMessage(interaction, `Could not convert ${options.time} to a delay`);
      return;
    }

    actualBanCmd(
      pluginData,
      interaction,
      options.user,
      convertedTime,
      options.reason || "",
      attachments,
      interaction.member as GuildMember,
      mod,
      contactMethods,
      options["delete-days"] ?? undefined,
    );
  },
});
