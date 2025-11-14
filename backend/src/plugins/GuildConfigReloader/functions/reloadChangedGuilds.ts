import { Snowflake } from "discord.js";
import { GlobalPluginData } from "vety";
import { SECONDS } from "../../../utils.js";
import { GuildConfigReloaderPluginType } from "../types.js";

const CHECK_INTERVAL = 1 * SECONDS;

export async function reloadChangedGuilds(pluginData: GlobalPluginData<GuildConfigReloaderPluginType>) {
  if (pluginData.state.unloaded) return;

  const changedConfigs = await pluginData.state.guildConfigs.getActiveLargerThanId(pluginData.state.highestConfigId);
  for (const item of changedConfigs) {
    if (!item.key.startsWith("guild-")) continue;

    const guildId = item.key.slice("guild-".length) as Snowflake;
    // tslint:disable-next-line:no-console
    console.log(`Config changed, reloading guild ${guildId}`);
    await pluginData.getVetyInstance().reloadGuild(guildId);

    if (item.id > pluginData.state.highestConfigId) {
      pluginData.state.highestConfigId = item.id;
    }
  }

  pluginData.state.nextCheckTimeout = setTimeout(() => reloadChangedGuilds(pluginData), CHECK_INTERVAL);
}
