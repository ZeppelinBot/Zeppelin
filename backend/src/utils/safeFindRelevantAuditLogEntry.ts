import { GuildPluginData } from "knub";
import { LogType } from "../data/LogType";
import { LogsPlugin } from "../plugins/Logs/LogsPlugin";
import { findRelevantAuditLogEntry, isDiscordAPIError } from "../utils";

/**
 * Wrapper for findRelevantAuditLogEntry() that handles permission errors gracefully.
 * Calling plugin must have LogsPlugin as a dependency (or be LogsPlugin itself).
 */
export async function safeFindRelevantAuditLogEntry(
  pluginData: GuildPluginData<any>,
  actionType: number,
  userId: string,
  attempts?: number,
  attemptDelay?: number,
) {
  try {
    return await findRelevantAuditLogEntry(pluginData.guild, actionType, userId, attempts, attemptDelay);
  } catch (e) {
    if (isDiscordAPIError(e) && e.code === 50013) {
      const logs = pluginData.getPlugin(LogsPlugin);
      logs.log(LogType.BOT_ALERT, {
        body: "Missing permissions to read audit log",
      });
      return;
    }

    throw e;
  }
}
