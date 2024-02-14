import { ChannelType } from "discord.js";
import { slashOptions } from "knub";
import { hasPermission, sendErrorMessage } from "../../../../pluginUtils";
import { UserNotificationMethod } from "../../../../utils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { actualKickCmd } from "../../functions/actualCommands/actualKickCmd";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to kick as", required: false }),
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
  slashOptions.boolean({
    name: "clean",
    description: "Whether or not to delete the member's last messages",
    required: false,
  }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason of the kick",
  }),
];

export const KickSlashCmd = {
  name: "kick",
  configPermission: "can_kick",
  description: "Kick the specified member",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to kick", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      sendErrorMessage(pluginData, interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

    let mod = interaction.member;
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
    }

    let contactMethods: UserNotificationMethod[] | undefined;
    try {
      contactMethods = readContactMethodsFromArgs(options) ?? undefined;
    } catch (e) {
      sendErrorMessage(pluginData, interaction, e.message);
      return;
    }

    actualKickCmd(
      pluginData,
      interaction,
      interaction.member,
      options.user,
      options.reason || "",
      attachments,
      mod,
      contactMethods,
      options.clean,
    );
  },
};
