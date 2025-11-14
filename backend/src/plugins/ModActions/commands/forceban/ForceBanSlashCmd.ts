import { GuildMember } from "discord.js";
import { slashOptions } from "vety";
import { hasPermission } from "../../../../pluginUtils.js";
import { convertDelayStringToMS, resolveMember } from "../../../../utils.js";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions.js";
import { modActionsSlashCmd } from "../../types.js";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants.js";
import { actualForceBanCmd } from "./actualForceBanCmd.js";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to ban as", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const ForceBanSlashCmd = modActionsSlashCmd({
  name: "forceban",
  configPermission: "can_ban",
  description: "Force-ban the specified user, even if they aren't on the server",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to ban", required: true }), ...opts],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    if ((!options.reason || options.reason.trim() === "") && attachments.length < 1) {
      pluginData.state.common.sendErrorMessage(interaction, "Text or attachment required", undefined, undefined, true);

      return;
    }

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

    const convertedTime = options.time ? convertDelayStringToMS(options.time) : null;
    if (options.time && !convertedTime) {
      pluginData.state.common.sendErrorMessage(interaction, `Could not convert ${options.time} to a delay`);
      return;
    }

    actualForceBanCmd(
      pluginData,
      interaction,
      interaction.user.id,
      options.user,
      options.reason ?? "",
      attachments,
      mod,
    );
  },
});
