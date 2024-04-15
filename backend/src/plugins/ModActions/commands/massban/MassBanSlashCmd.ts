import { GuildMember } from "discord.js";
import { slashOptions } from "knub";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { actualMassBanCmd } from "./actualMassBanCmd";
import { modActionsSlashCmd } from "../../types";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const MassBanSlashCmd = modActionsSlashCmd({
  name: "massban",
  configPermission: "can_massban",
  description: "Mass-ban a list of user IDs",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "user-ids", description: "The list of user IDs to ban", required: true }),

    ...opts,
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      pluginData.state.common.sendErrorMessage(
        interaction,
        "Text or attachment required",
        undefined,
        undefined,
        true
      );

      return;
    }

    actualMassBanCmd(
      pluginData,
      interaction,
      options["user-ids"].split(/\D+/),
      interaction.member as GuildMember,
      options.reason || "",
      attachments,
    );
  },
});
