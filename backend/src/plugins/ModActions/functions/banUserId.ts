import { DiscordAPIError, Snowflake, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { logger } from "../../../logger";
import { renderTemplate } from "../../../templateFormatter";
import {
  createUserNotificationError,
  notifyUser,
  resolveUser,
  stripObjectToScalars,
  ucfirst,
  UserNotificationResult,
} from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { BanOptions, BanResult, IgnoredEventType, ModActionsPluginType } from "../types";
import { getDefaultContactMethods } from "./getDefaultContactMethods";
import { ignoreEvent } from "./ignoreEvent";

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
    await pluginData.guild.bans.create(userId as Snowflake, {
      days: deleteMessageDays,
      reason: reason != null ? encodeURIComponent(reason) : undefined,
    });
  } catch (e) {
    let errorMessage;
    if (e instanceof DiscordAPIError) {
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

  const existingTempban = await pluginData.state.tempbans.findExistingTempbanForUserId(user.id);
  if (banTime && banTime > 0) {
    const selfId = pluginData.client.user!.id;
    if (existingTempban) {
      pluginData.state.tempbans.updateExpiryTime(user.id, banTime, banOptions.modId ?? selfId);
    } else {
      pluginData.state.tempbans.addTempban(user.id, banTime, banOptions.modId ?? selfId);
    }
  }

  // Create a case for this action
  const modId = banOptions.caseArgs?.modId || pluginData.client.user!.id;
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
