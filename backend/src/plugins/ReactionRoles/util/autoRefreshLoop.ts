import { GuildPluginData } from "vety";
import { ReactionRolesPluginType } from "../types.js";
import { runAutoRefresh } from "./runAutoRefresh.js";

export async function autoRefreshLoop(pluginData: GuildPluginData<ReactionRolesPluginType>, interval: number) {
  pluginData.state.autoRefreshTimeout = setTimeout(async () => {
    await runAutoRefresh(pluginData);
    autoRefreshLoop(pluginData, interval);
  }, interval);
}
