import { findRelevantAuditLogEntry, isDiscordRESTError } from "../../../utils";
import { PluginData } from "knub";
import { ModActionsPluginType } from "../types";
import { LogType } from "../../../data/LogType";

/**
 * Wrapper for findRelevantAuditLogEntry() that handles permission errors gracefully
 */
export async function safeFindRelevantAuditLogEntry(
  pluginData: PluginData<ModActionsPluginType>,
  actionType: number,
  userId: string,
  attempts?: number,
  attemptDelay?: number,
) {
  try {
    return await findRelevantAuditLogEntry(pluginData.guild, actionType, userId, attempts, attemptDelay);
  } catch (e) {
    if (isDiscordRESTError(e) && e.code === 50013) {
      pluginData.state.serverLogs.log(LogType.BOT_ALERT, {
        body: "Missing permissions to read audit log",
      });
    } else {
      throw e;
    }
  }
}
