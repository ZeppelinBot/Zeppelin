import { GlobalPluginData } from "knub";
import { SECONDS } from "../../../utils";
import { GuildConfigReloaderPluginType } from "../types";

const CHECK_INTERVAL = 1 * SECONDS;

export async function reloadChangedGuilds(pluginData: GlobalPluginData<GuildConfigReloaderPluginType>) {
  if (pluginData.state.unloaded) return;

  const changedConfigs = await pluginData.state.guildConfigs.getActiveLargerThanId(pluginData.state.highestConfigId);
  for (const item of changedConfigs) {
    if (!item.key.startsWith("guild-")) continue;

    const guildId = item.key.slice("guild-".length);
    console.log(`Config changed, reloading guild ${guildId}`);
    await pluginData.getKnubInstance().reloadGuild(guildId);

    if (item.id > pluginData.state.highestConfigId) {
      pluginData.state.highestConfigId = item.id;
    }
  }

  pluginData.state.nextCheckTimeout = setTimeout(() => reloadChangedGuilds(pluginData), CHECK_INTERVAL);
}
