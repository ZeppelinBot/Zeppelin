import { PluginData } from "knub";
import { ModActionsPluginType } from "../types";
import { isDiscordHTTPError } from "../../../utils";

export async function isBanned(pluginData: PluginData<ModActionsPluginType>, userId: string): Promise<boolean> {
  try {
    const bans = await pluginData.guild.getBans();
    return bans.some(b => b.user.id === userId);
  } catch (e) {
    if (isDiscordHTTPError(e) && e.code === 500) {
      return false;
    }

    throw e;
  }
}
