import { slashOptions } from "knub";
import { hasPermission } from "../../../../pluginUtils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualUnbanCmd } from "../../functions/actualCommands/actualUnbanCmd";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to unban as", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const UnbanSlashCmd = {
  name: "unban",
  configPermission: "can_unban",
  description: "Unban the specified member",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to unban", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      pluginData
        .getPlugin(CommonPlugin)
        .sendErrorMessage(interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

    let mod = interaction.member;
    const canActAsOther = await hasPermission(pluginData, "can_act_as_other", {
      channel: interaction.channel,
      member: interaction.member,
    });

    if (options.mod) {
      if (!canActAsOther) {
        pluginData
          .getPlugin(CommonPlugin)
          .sendErrorMessage(interaction, "You don't have permission to act as another moderator");
        return;
      }

      mod = options.mod;
    }

    actualUnbanCmd(pluginData, interaction, interaction.user.id, options.user, options.reason, attachments, mod);
  },
};
