import { GuildPluginData } from "knub";
import { BanOptions, BanResult, IgnoredEventType, ModActionsPluginType } from "../types";
import {
  createUserNotificationError,
  notifyUser,
  resolveUser,
  stripObjectToScalars,
  ucfirst,
  UserNotificationResult,
} from "../../../utils";
import { DiscordRESTError, User } from "eris";
import { renderTemplate } from "../../../templateFormatter";
import { getDefaultContactMethods } from "./getDefaultContactMethods";
import { LogType } from "../../../data/LogType";
import { ignoreEvent } from "./ignoreEvent";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { logger } from "../../../logger";
import humanizeDuration from "humanize-duration";

/**
 * Ban the specified user id, whether or not they're actually on the server at the time. Generates a case.
 */
export async function banUserId(
  pluginData: GuildPluginData<ModActionsPluginType>,
  userId: string,
  reason?: string,
  banOptions: BanOptions = {},
  banTime?: number,
): Promise<BanResult> {
  const config = pluginData.config.get();
  const user = await resolveUser(pluginData.client, userId);
  if (!user.id) {
    return {
      status: "failed",
      error: "Invalid user",
    };
  }

  // Attempt to message the user *before* banning them, as doing it after may not be possible
  let notifyResult: UserNotificationResult = { method: null, success: true };
  if (reason && user instanceof User) {
    const contactMethods = banOptions?.contactMethods
      ? banOptions.contactMethods
      : getDefaultContactMethods(pluginData, "ban");

    if (contactMethods.length) {
      if (!banTime && config.ban_message) {
        const banMessage = await renderTemplate(config.ban_message, {
          guildName: pluginData.guild.name,
          reason,
          moderator: banOptions.caseArgs?.modId
            ? stripObjectToScalars(await resolveUser(pluginData.client, banOptions.caseArgs.modId))
            : {},
        });

        notifyResult = await notifyUser(user, banMessage, contactMethods);
      } else if (banTime && config.tempban_message) {
        const banMessage = await renderTemplate(config.tempban_message, {
          guildName: pluginData.guild.name,
          reason,
          moderator: banOptions.caseArgs?.modId
            ? stripObjectToScalars(await resolveUser(pluginData.client, banOptions.caseArgs.modId))
            : {},
          banTime: humanizeDuration(banTime),
        });

        notifyResult = await notifyUser(user, banMessage, contactMethods);
      } else {
        notifyResult = createUserNotificationError("No ban/tempban message specified in config");
      }
    }
  }

  // (Try to) ban the user
  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId);
  ignoreEvent(pluginData, IgnoredEventType.Ban, userId);
  try {
    const deleteMessageDays = Math.min(30, Math.max(0, banOptions.deleteMessageDays ?? 1));
    await pluginData.guild.banMember(
      userId,
      deleteMessageDays,
      reason != null ? encodeURIComponent(reason) : undefined,
    );
  } catch (e) {
    let errorMessage;
    if (e instanceof DiscordRESTError) {
      errorMessage = `API error ${e.code}: ${e.message}`;
    } else {
      logger.warn(`Error applying ban to ${userId}: ${e}`);
      errorMessage = "Unknown error";
    }

    return {
      status: "failed",
      error: errorMessage,
    };
  }

  // Create a case for this action
  const modId = banOptions.caseArgs?.modId || pluginData.client.user.id;
  const casesPlugin = pluginData.getPlugin(CasesPlugin);

  const noteDetails: string[] = [];
  const timeUntilUnban = banTime ? humanizeDuration(banTime) : "indefinite";
  const timeDetails = `Banned ${banTime ? `for ${timeUntilUnban}` : "indefinitely"}`;
  if (notifyResult.text) noteDetails.push(ucfirst(notifyResult.text));
  noteDetails.push(timeDetails);

  const createdCase = await casesPlugin.createCase({
    ...(banOptions.caseArgs || {}),
    userId,
    modId,
    type: CaseTypes.Ban,
    reason,
    noteDetails,
  });

  // Log the action
  const mod = await resolveUser(pluginData.client, modId);
  const logtype = banTime ? LogType.MEMBER_TIMED_BAN : LogType.MEMBER_BAN;
  pluginData.state.serverLogs.log(logtype, {
    mod: stripObjectToScalars(mod),
    user: stripObjectToScalars(user),
    caseNumber: createdCase.case_number,
    reason,
    banTime: banTime ? humanizeDuration(banTime) : null,
  });

  pluginData.state.events.emit("ban", user.id, reason, banOptions.isAutomodAction);

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
