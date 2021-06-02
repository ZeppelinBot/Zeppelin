import { GuildPluginData } from "knub";
import { ModActionsPluginType } from "../types";
import { isDiscordHTTPError, isDiscordRESTError, SECONDS, sleep } from "../../../utils";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { LogType } from "../../../data/LogType";
import { hasDiscordPermissions } from "../../../utils/hasDiscordPermissions";
import { Permissions } from "discord.js";

export async function isBanned(
  pluginData: GuildPluginData<ModActionsPluginType>,
  userId: string,
  timeout: number = 5 * SECONDS,
): Promise<boolean> {
  const botMember = pluginData.guild.members.cache.get(pluginData.client.user!.id);
  if (botMember && !hasDiscordPermissions(botMember.permissions, Permissions.FLAGS.BAN_MEMBERS)) {
    pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
      body: `Missing "Ban Members" permission to check for existing bans`,
    });
    return false;
  }

  try {
    const potentialBan = await Promise.race([pluginData.guild.bans.fetch({ user: userId }), sleep(timeout)]);
    return potentialBan != null;
  } catch (e) {
    if (isDiscordRESTError(e) && e.code === 10026) {
      // [10026]: Unknown Ban
      return false;
    }

    if (isDiscordHTTPError(e) && e.code === 500) {
      // Internal server error, ignore
      return false;
    }

    if (isDiscordRESTError(e) && e.code === 50013) {
      pluginData.getPlugin(LogsPlugin).log(LogType.BOT_ALERT, {
        body: `Missing "Ban Members" permission to check for existing bans`,
      });
    }

    throw e;
  }
}
