import { GuildMember } from "discord.js";
import { slashOptions } from "vety";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions.js";
import { modActionsSlashCmd } from "../../types.js";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants.js";
import { actualMassUnbanCmd } from "./actualMassUnbanCmd.js";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const MassUnbanSlashCmd = modActionsSlashCmd({
  name: "massunban",
  configPermission: "can_massunban",
  description: "Mass-unban a list of user IDs",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "user-ids", description: "The list of user IDs to unban", required: true }),

    ...opts,
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      pluginData.state.common.sendErrorMessage(interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

    actualMassUnbanCmd(
      pluginData,
      interaction,
      options["user-ids"].split(/[\s,\r\n]+/),
      interaction.member as GuildMember,
      options.reason || "",
      attachments,
    );
  },
});
