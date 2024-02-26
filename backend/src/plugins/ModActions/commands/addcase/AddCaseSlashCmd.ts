import { slashOptions } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { hasPermission } from "../../../../pluginUtils";
import { generateAttachmentSlashOptions, retrieveMultipleOptions } from "../../../../utils/multipleSlashOptions";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualAddCaseCmd } from "../../functions/actualCommands/actualAddCaseCmd";
import { NUMBER_ATTACHMENTS_CASE_CREATION } from "../constants";

const opts = [
  slashOptions.string({ name: "reason", description: "The reason", required: false }),
  slashOptions.user({ name: "mod", description: "The moderator to add this case as", required: false }),
  ...generateAttachmentSlashOptions(NUMBER_ATTACHMENTS_CASE_CREATION, {
    name: "attachment",
    description: "An attachment to add to the reason",
  }),
];

export const AddCaseSlashCmd = {
  name: "addcase",
  configPermission: "can_addcase",
  description: "Add an arbitrary case to the specified user without taking any action",
  allowDms: false,

  signature: [
    slashOptions.string({
      name: "type",
      description: "The type of case to add",
      required: true,
      choices: Object.keys(CaseTypes).map((type) => ({ name: type, value: type })),
    }),
    slashOptions.user({ name: "user", description: "The user to add a case to", required: true }),

    ...opts,
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const attachments = retrieveMultipleOptions(NUMBER_ATTACHMENTS_CASE_CREATION, options, "attachment");

    // The moderator who did the action is the message author or, if used, the specified -mod
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

    actualAddCaseCmd(
      pluginData,
      interaction,
      interaction.member,
      mod,
      attachments,
      options.user,
      options.type as keyof CaseTypes,
      options.reason || "",
    );
  },
};
