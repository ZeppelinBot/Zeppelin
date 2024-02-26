import { ChannelType } from "discord.js";
import { slashOptions } from "knub";
import { canActOn, hasPermission } from "../../../../pluginUtils";
import { UserNotificationMethod, resolveMember } from "../../../../utils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualWarnCmd } from "../../functions/actualCommands/actualWarnCmd";
import { isBanned } from "../../functions/isBanned";
import { readContactMethodsFromArgs } from "../../functions/readContactMethodsFromArgs";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to warn as", required: false }),
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

export const WarnSlashCmd = {
  name: "warn",
  configPermission: "can_warn",
  description: "Send a warning to the specified user",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to warn", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      await pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

    const memberToWarn = await resolveMember(pluginData.client, pluginData.guild, options.user.id);

    if (!memberToWarn) {
      const _isBanned = await isBanned(pluginData, options.user.id);
      if (_isBanned) {
        await pluginData.getPlugin(CommonPlugin).sendErrorMessage(interaction, `User is banned`);
      } else {
        await pluginData.getPlugin(CommonPlugin).sendErrorMessage(interaction, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to warn this member
    if (!canActOn(pluginData, interaction.member, memberToWarn)) {
      await pluginData.getPlugin(CommonPlugin).sendErrorMessage(interaction, "Cannot warn: insufficient permissions");
      return;
    }

    let mod = interaction.member;
    const canActAsOther = await hasPermission(pluginData, "can_act_as_other", {
      channel: interaction.channel,
      member: interaction.member,
    });

    if (options.mod) {
      if (!canActAsOther) {
        await pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(interaction, "You don't have permission to act as another moderator");
        return;
      }

      mod = options.mod;
    }

    let contactMethods: UserNotificationMethod[] | undefined;
    try {
      contactMethods = readContactMethodsFromArgs(options) ?? undefined;
    } catch (e) {
      await pluginData.getPlugin(CommonPlugin).sendErrorMessage(interaction, e.message);
      return;
    }

    actualWarnCmd(
      pluginData,
      interaction,
      interaction.user.id,
      mod,
      memberToWarn,
      options.reason ?? "",
      attachments,
      contactMethods,
    );
  },
};
