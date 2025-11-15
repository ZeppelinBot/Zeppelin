import { GuildMember } from "discord.js";
import { slashOptions } from "vety";
import { hasPermission } from "../../../../pluginUtils.js";
import { resolveMember } from "../../../../utils.js";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions.js";
import { modActionsSlashCmd } from "../../types.js";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants.js";
import { actualUnbanCmd } from "./actualUnbanCmd.js";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to unban as", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const UnbanSlashCmd = modActionsSlashCmd({
  name: "unban",
  configPermission: "can_unban",
  description: "Unban the specified member",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to unban", required: true }), ...opts],

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

    actualUnbanCmd(pluginData, interaction, interaction.user.id, options.user, options.reason ?? "", attachments, mod);
  },
});
