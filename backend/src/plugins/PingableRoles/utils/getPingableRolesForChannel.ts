import { PingableRole } from "src/data/entities/PingableRole";
import { PluginData } from "knub";
import { PingableRolesPluginType } from "../types";

export async function getPingableRolesForChannel(
  pluginData: PluginData<PingableRolesPluginType>,
  channelId: string,
): Promise<PingableRole[]> {
  if (!pluginData.state.cache.has(channelId)) {
    pluginData.state.cache.set(channelId, await pluginData.state.pingableRoles.getForChannel(channelId));
  }

  return pluginData.state.cache.get(channelId);
}
