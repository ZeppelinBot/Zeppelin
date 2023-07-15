import { guildPluginUserContextMenuCommand } from "knub";
import { launchMuteActionModal } from "../actions/mute";

export const MuteCmd = guildPluginUserContextMenuCommand({
  name: "Mute",
  async run({ pluginData, interaction }) {
    await launchMuteActionModal(pluginData, interaction, interaction.targetId);
  },
});
