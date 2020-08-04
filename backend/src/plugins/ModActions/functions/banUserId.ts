import { PluginData } from "knub";
import { BanOptions, BanResult, IgnoredEventType, ModActionsPluginType } from "../types";
import { notifyUser, resolveUser, stripObjectToScalars, ucfirst, UserNotificationResult } from "../../../utils";
import { User } from "eris";
import { renderTemplate } from "../../../templateFormatter";
import { getDefaultContactMethods } from "./getDefaultContactMethods";
import { LogType } from "../../../data/LogType";
import { ignoreEvent } from "./ignoreEvent";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";

/**
 * Ban the specified user id, whether or not they're actually on the server at the time. Generates a case.
 */
export async function banUserId(
  pluginData: PluginData<ModActionsPluginType>,
  userId: string,
  reason: string = null,
  banOptions: BanOptions = {},
): Promise<BanResult> {
  const config = pluginData.config.get();
  const user = await resolveUser(pluginData.client, userId);

  // Attempt to message the user *before* banning them, as doing it after may not be possible
  let notifyResult: UserNotificationResult = { method: null, success: true };
  if (reason && user instanceof User) {
    const banMessage = await renderTemplate(config.ban_message, {
      guildName: pluginData.guild.name,
      reason,
    });

    const contactMethods = banOptions?.contactMethods
      ? banOptions.contactMethods
      : getDefaultContactMethods(pluginData, "ban");
    notifyResult = await notifyUser(user, banMessage, contactMethods);
  }

  // (Try to) ban the user
  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId);
  ignoreEvent(pluginData, IgnoredEventType.Ban, userId);
  try {
    const deleteMessageDays = Math.min(30, Math.max(0, banOptions.deleteMessageDays ?? 1));
    await pluginData.guild.banMember(userId, deleteMessageDays, encodeURIComponent(reason));
  } catch (e) {
    return {
      status: "failed",
      error: e.message,
    };
  }

  // Create a case for this action
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    ...(banOptions.caseArgs || {}),
    userId,
    modId: banOptions.caseArgs?.modId,
    type: CaseTypes.Ban,
    reason,
    noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
  });

  // Log the action
  const mod = await resolveUser(pluginData.client, banOptions.caseArgs?.modId);
  pluginData.state.serverLogs.log(LogType.MEMBER_BAN, {
    mod: stripObjectToScalars(mod),
    user: stripObjectToScalars(user),
    caseNumber: createdCase.case_number,
    reason,
  });

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
