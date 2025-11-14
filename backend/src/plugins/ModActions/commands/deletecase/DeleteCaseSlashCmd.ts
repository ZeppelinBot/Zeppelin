import { GuildMember } from "discord.js";
import { slashOptions } from "vety";
import { modActionsSlashCmd } from "../../types.js";
import { actualDeleteCaseCmd } from "./actualDeleteCaseCmd.js";

const opts = [slashOptions.boolean({ name: "force", description: "Whether or not to force delete", required: false })];

export const DeleteCaseSlashCmd = modActionsSlashCmd({
  name: "deletecase",
  configPermission: "can_deletecase",
  description: "Delete the specified case. This operation can *not* be reversed.",
  allowDms: false,

  signature: [
    slashOptions.string({ name: "case-number", description: "The number of the case to delete", required: true }),

    ...opts,
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });

    actualDeleteCaseCmd(
      pluginData,
      interaction,
      interaction.member as GuildMember,
      options["case-number"].split(/\D+/).map(Number),
      !!options.force,
    );
  },
});
