import { slashOptions } from "knub";
import { hasPermission, sendErrorMessage } from "../../../../pluginUtils";
import { convertDelayStringToMS } from "../../../../utils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { actualForceBanCmd } from "../../functions/actualCommands/actualForceBanCmd";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to ban as", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason of the ban",
  }),
];

export const ForceBanSlashCmd = {
  name: "forceban",
  configPermission: "can_ban",
  description: "Force-ban the specified user, even if they aren't on the server",
  allowDms: false,

  signature: [slashOptions.user({ name: "user", description: "The user to ban", required: true }), ...opts],

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

    const convertedTime = options.time ? convertDelayStringToMS(options.time) : null;
    if (options.time && !convertedTime) {
      sendErrorMessage(pluginData, interaction, `Could not convert ${options.time} to a delay`);
      return;
    }

    actualForceBanCmd(pluginData, interaction, interaction.user.id, options.user, options.reason, attachments, mod);
  },
};
