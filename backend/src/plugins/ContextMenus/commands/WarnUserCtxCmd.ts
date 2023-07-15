import { guildPluginUserContextMenuCommand } from "knub";
import { launchWarnActionModal } from "../actions/warn";

export const WarnCmd = guildPluginUserContextMenuCommand({
  name: "Warn",
  async run({ pluginData, interaction }) {
    await launchWarnActionModal(pluginData, interaction, interaction.targetId);
  },
});
