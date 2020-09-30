import { GuildPluginData } from "knub";
import { ReactionRolesPluginType } from "../types";
import { runAutoRefresh } from "./runAutoRefresh";

export async function autoRefreshLoop(pluginData: GuildPluginData<ReactionRolesPluginType>, interval: number) {
  pluginData.state.autoRefreshTimeout = setTimeout(async () => {
    await runAutoRefresh(pluginData);
    autoRefreshLoop(pluginData, interval);
  }, interval);
}
