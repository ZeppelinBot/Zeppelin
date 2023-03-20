import { Snowflake } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";
import { CaseTypes } from "../../../data/CaseTypes";
import { Tempban } from "../../../data/entities/Tempban";
import { resolveUser } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { formatReasonWithAttachments } from "./formatReasonWithAttachments";
import { ignoreEvent } from "./ignoreEvent";
import { isBanned } from "./isBanned";

export async function clearTempban(pluginData: GuildPluginData<ModActionsPluginType>, tempban: Tempban) {
  if (!(await isBanned(pluginData, tempban.user_id))) {
    pluginData.state.tempbans.clear(tempban.user_id);
    return;
  }

  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, tempban.user_id);
  const reason = formatReasonWithAttachments(
    `Tempban timed out.
    Tempbanned at: \`${tempban.created_at} UTC\``,
    [],
  );
  try {
    ignoreEvent(pluginData, IgnoredEventType.Unban, tempban.user_id);
    await pluginData.guild.bans.remove(tempban.user_id as Snowflake, reason ?? undefined);
  } catch (e) {
    pluginData.getPlugin(LogsPlugin).logBotAlert({
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
  pluginData.getPlugin(LogsPlugin).logMemberTimedUnban({
    mod: await resolveUser(pluginData.client, tempban.mod_id),
    userId: tempban.user_id,
    caseNumber: createdCase.case_number,
    reason,
    banTime: humanizeDuration(banTime),
  });
}
