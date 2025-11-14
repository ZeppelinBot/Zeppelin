import { DiscordAPIError, Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { LogType } from "../../../data/LogType.js";
import { registerExpiringTempban } from "../../../data/loops/expiringTempbansLoop.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { logger } from "../../../logger.js";
import { TemplateParseError, TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import {
  DAYS,
  SECONDS,
  UserNotificationResult,
  createUserNotificationError,
  notifyUser,
  resolveMember,
  resolveUser,
  ucfirst,
} from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { BanOptions, BanResult, IgnoredEventType, ModActionsPluginType } from "../types.js";
import { getDefaultContactMethods } from "./getDefaultContactMethods.js";
import { ignoreEvent } from "./ignoreEvent.js";

/**
 * Ban the specified user id, whether or not they're actually on the server at the time. Generates a case.
 */
export async function banUserId(
  pluginData: GuildPluginData<ModActionsPluginType>,
  userId: string,
  reason?: string,
  reasonWithAttachments?: string,
  banOptions: BanOptions = {},
  banTime?: number,
): Promise<BanResult> {
  const config = pluginData.config.get();
  const user = await resolveUser(pluginData.client, userId, "ModActions:banUserId");
  if (!user.id) {
    return {
      status: "failed",
      error: "Invalid user",
    };
  }

  // Attempt to message the user *before* banning them, as doing it after may not be possible
  const member = await resolveMember(pluginData.client, pluginData.guild, userId);
  let notifyResult: UserNotificationResult = { method: null, success: true };
  if (reasonWithAttachments && member) {
    const contactMethods = banOptions?.contactMethods
      ? banOptions.contactMethods
      : getDefaultContactMethods(pluginData, "ban");

    if (contactMethods.length) {
      if (!banTime && config.ban_message) {
        let banMessage: string;
        try {
          banMessage = await renderTemplate(
            config.ban_message,
            new TemplateSafeValueContainer({
              guildName: pluginData.guild.name,
              reason: reasonWithAttachments,
              moderator: banOptions.caseArgs?.modId
                ? userToTemplateSafeUser(await resolveUser(pluginData.client, banOptions.caseArgs.modId, "ModActions:banUserId"))
                : null,
            }),
          );
        } catch (err) {
          if (err instanceof TemplateParseError) {
            return {
              status: "failed",
              error: `Invalid ban_message format: ${err.message}`,
            };
          }
          throw err;
        }

        notifyResult = await notifyUser(member.user, banMessage, contactMethods);
      } else if (banTime && config.tempban_message) {
        let banMessage: string;
        try {
          banMessage = await renderTemplate(
            config.tempban_message,
            new TemplateSafeValueContainer({
              guildName: pluginData.guild.name,
              reason: reasonWithAttachments,
              moderator: banOptions.caseArgs?.modId
                ? userToTemplateSafeUser(await resolveUser(pluginData.client, banOptions.caseArgs.modId, "ModActions:banUserId"))
                : null,
              banTime: humanizeDuration(banTime),
            }),
          );
        } catch (err) {
          if (err instanceof TemplateParseError) {
            return {
              status: "failed",
              error: `Invalid tempban_message format: ${err.message}`,
            };
          }
          throw err;
        }

        notifyResult = await notifyUser(member.user, banMessage, contactMethods);
      } else {
        notifyResult = createUserNotificationError("No ban/tempban message specified in config");
      }
    }
  }

  // (Try to) ban the user
  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId);
  ignoreEvent(pluginData, IgnoredEventType.Ban, userId);
  try {
    const deleteMessageDays = Math.min(7, Math.max(0, banOptions.deleteMessageDays ?? 1));
    await pluginData.guild.bans.create(userId as Snowflake, {
      deleteMessageSeconds: (deleteMessageDays * DAYS) / SECONDS,
      reason: reason ?? undefined,
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

  const tempbanLock = await pluginData.locks.acquire(`tempban-${user.id}`);
  const existingTempban = await pluginData.state.tempbans.findExistingTempbanForUserId(user.id);
  if (banTime && banTime > 0) {
    const selfId = pluginData.client.user!.id;
    if (existingTempban) {
      await pluginData.state.tempbans.updateExpiryTime(user.id, banTime, banOptions.modId ?? selfId);
    } else {
      await pluginData.state.tempbans.addTempban(user.id, banTime, banOptions.modId ?? selfId);
    }
    const tempban = (await pluginData.state.tempbans.findExistingTempbanForUserId(user.id))!;
    registerExpiringTempban(tempban);
  }
  tempbanLock.unlock();

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
  const mod = await resolveUser(pluginData.client, modId, "ModActions:banUserId");

  if (banTime) {
    pluginData.getPlugin(LogsPlugin).logMemberTimedBan({
      mod,
      user,
      caseNumber: createdCase.case_number,
      reason: reason ?? "",
      banTime: humanizeDuration(banTime),
    });
  } else {
    pluginData.getPlugin(LogsPlugin).logMemberBan({
      mod,
      user,
      caseNumber: createdCase.case_number,
      reason: reason ?? "",
    });
  }

  pluginData.state.events.emit("ban", user.id, reason, banOptions.isAutomodAction);

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
