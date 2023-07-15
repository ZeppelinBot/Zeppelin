import { guildPluginUserContextMenuCommand } from "knub";
import { launchBanActionModal } from "../actions/ban";

export const BanCmd = guildPluginUserContextMenuCommand({
  name: "Ban",
  async run({ pluginData, interaction }) {
    await launchBanActionModal(pluginData, interaction, interaction.targetId);
  },
});
