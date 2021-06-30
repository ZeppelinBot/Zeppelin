import { Snowflake } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";
import { CaseTypes } from "../../../data/CaseTypes";
import { resolveUser, SECONDS, stripObjectToScalars } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { formatReasonWithAttachments } from "./formatReasonWithAttachments";
import { ignoreEvent } from "./ignoreEvent";
import { isBanned } from "./isBanned";

const TEMPBAN_LOOP_TIME = 60 * SECONDS;

export async function outdatedTempbansLoop(pluginData: GuildPluginData<ModActionsPluginType>) {
  const outdatedTempbans = await pluginData.state.tempbans.getExpiredTempbans();

  for (const tempban of outdatedTempbans) {
    if (!(await isBanned(pluginData, tempban.user_id))) {
      pluginData.state.tempbans.clear(tempban.user_id);
      continue;
    }

    pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, tempban.user_id);
    const reason = formatReasonWithAttachments(
      `Tempban timed out.
      Tempbanned at: \`${tempban.created_at} UTC\``,
      [],
    );
    try {
      ignoreEvent(pluginData, IgnoredEventType.Unban, tempban.user_id);
      await pluginData.guild.bans.remove(
        tempban.user_id as Snowflake,
        reason != null ? encodeURIComponent(reason) : undefined,
      );
    } catch (e) {
      pluginData.state.serverLogs.log(LogType.BOT_ALERT, {
        body: `Encountered an error trying to automatically unban ${tempban.user_id} after tempban timeout`,
      });
      logger.warn(`Error automatically unbanning ${tempban.user_id} (tempban timeout): ${e}`);
      return;
    }

    // Create case and delete tempban
    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const createdCase = await casesPlugin.createCase({
      userId: tempban.user_id,
      modId: tempban.mod_id,
      type: CaseTypes.Unban,
      reason,
      ppId: undefined,
    });
    pluginData.state.tempbans.clear(tempban.user_id);

    // Log the unban
    const banTime = moment(tempban.created_at).diff(moment(tempban.expires_at));
    pluginData.state.serverLogs.log(LogType.MEMBER_TIMED_UNBAN, {
      mod: stripObjectToScalars(await resolveUser(pluginData.client, tempban.mod_id)),
      userId: tempban.user_id,
      caseNumber: createdCase.case_number,
      reason,
      banTime: humanizeDuration(banTime),
    });
  }

  if (!pluginData.state.unloaded) {
    pluginData.state.outdatedTempbansTimeout = setTimeout(() => outdatedTempbansLoop(pluginData), TEMPBAN_LOOP_TIME);
  }
}
