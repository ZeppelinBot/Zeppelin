import { isStaffPreFilter, sendErrorMessage } from "../../../pluginUtils";
import { getActiveReload, setActiveReload } from "../activeReload";
import { botControlCmd } from "../types";

export const ReloadGlobalPluginsCmd = botControlCmd({
  trigger: "bot_reload_global_plugins",
  permission: null,
  config: {
    preFilters: [isStaffPreFilter],
  },

  async run({ pluginData, message }) {
    if (getActiveReload()) return;

    const guildId = "guild" in message.channel ? message.channel.guild.id : null;
    if (!guildId) {
      sendErrorMessage(pluginData, message.channel, "This command can only be used in a server");
      return;
    }

    setActiveReload(guildId, message.channel.id);
    await message.channel.send("Reloading global plugins...");

    pluginData.getKnubInstance().reloadGlobalContext();
  },
});
