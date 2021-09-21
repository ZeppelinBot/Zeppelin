import { Snowflake } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import moment from "moment-timezone";
import { LogType } from "src/data/LogType";
import { logger } from "src/logger";
import { CaseTypes } from "../../../data/CaseTypes";
import { MINUTES, resolveUser } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../types";
import { formatReasonWithAttachments } from "./formatReasonWithAttachments";
import { ignoreEvent } from "./ignoreEvent";
import { isBanned } from "./isBanned";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { Tempban } from "src/data/entities/Tempban";
import { addTimer } from "src/utils/timers";

const LOAD_LESS_THAN_MIN_COUNT = 60 * MINUTES;

export async function loadExpiringTimers(pluginData: GuildPluginData<ModActionsPluginType>) {
  const now = moment.utc().toDate().getTime();
  pluginData.state.timers = pluginData.state.timers.filter((tm) => !tm.done || !tm.timeout);
  const tempbans = (await pluginData.state.tempbans.getAllTempbans()).filter((m) => m.expires_at);
  const expiredBans = tempbans.filter((m) => now >= moment(m.expires_at!).toDate().getTime());
  const expiringBans = tempbans.filter(
    (m) => !expiredBans.find((exp) => exp.user_id === m.user_id && exp.guild_id === m.guild_id),
  );

  for (const tempban of expiringBans) {
    const expires = moment(tempban.expires_at!).toDate().getTime();
    if (expires <= now) continue; // exclude expired mutes, just in case
    if (expires > now + LOAD_LESS_THAN_MIN_COUNT) continue; // exclude timers that are expiring in over 180 mins

    addTimer(pluginData, tempban, async () => {
      await clearTempBan(pluginData, tempban);
    });
  }

  for (const tempban of expiredBans) {
    await clearTempBan(pluginData, tempban);
  }
}

export async function clearTempBan(pluginData: GuildPluginData<ModActionsPluginType>, tempban: Tempban) {
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
