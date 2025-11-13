import { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import moment from "moment-timezone";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { LogType } from "../../../data/LogType.js";
import { Tempban } from "../../../data/entities/Tempban.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { logger } from "../../../logger.js";
import { resolveUser } from "../../../utils.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { IgnoredEventType, ModActionsPluginType } from "../types.js";
import { ignoreEvent } from "./ignoreEvent.js";
import { isBanned } from "./isBanned.js";

export async function clearTempban(pluginData: GuildPluginData<ModActionsPluginType>, tempban: Tempban) {
  if (!(await isBanned(pluginData, tempban.user_id))) {
    pluginData.state.tempbans.clear(tempban.user_id);
    return;
  }

  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, tempban.user_id);
  const reason = `Tempban timed out.
    Tempbanned at: \`${tempban.created_at} UTC\``;

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
    mod: await resolveUser(pluginData.client, tempban.mod_id, "ModActions:clearTempban"),
    userId: tempban.user_id,
    caseNumber: createdCase.case_number,
    reason,
    banTime: humanizeDuration(banTime),
  });
}
