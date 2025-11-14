import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import { GuildPluginData } from "vety";
import { getMemberLevel } from "vety/helpers";
import { CaseTypes } from "../../../../data/CaseTypes.js";
import { clearExpiringTempban, registerExpiringTempban } from "../../../../data/loops/expiringTempbansLoop.js";
import { humanizeDuration } from "../../../../humanizeDuration.js";
import { canActOn, getContextChannel } from "../../../../pluginUtils.js";
import { UnknownUser, UserNotificationMethod, renderUsername, resolveMember } from "../../../../utils.js";
import { banLock } from "../../../../utils/lockNameHelpers.js";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction.js";
import { CasesPlugin } from "../../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../../Logs/LogsPlugin.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import { banUserId } from "../../functions/banUserId.js";
import {
  formatReasonWithAttachments,
  formatReasonWithMessageLinkForAttachments,
} from "../../functions/formatReasonForAttachments.js";
import { isBanned } from "../../functions/isBanned.js";
import { ModActionsPluginType } from "../../types.js";

export async function actualBanCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  user: User | UnknownUser,
  time: number | null,
  reason: string,
  attachments: Attachment[],
  author: GuildMember,
  mod: GuildMember,
  contactMethods?: UserNotificationMethod[],
  deleteDays?: number,
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const memberToBan = await resolveMember(pluginData.client, pluginData.guild, user.id);
  const formattedReason = await formatReasonWithMessageLinkForAttachments(pluginData, reason, context, attachments);
  const formattedReasonWithAttachments = formatReasonWithAttachments(reason, attachments);

  // acquire a lock because of the needed user-inputs below (if banned/not on server)
  const lock = await pluginData.locks.acquire(banLock(user));
  let forceban = false;
  const existingTempban = await pluginData.state.tempbans.findExistingTempbanForUserId(user.id);

  if (!memberToBan) {
    const banned = await isBanned(pluginData, user.id);

    if (!banned) {
      // Ask the mod if we should upgrade to a forceban as the user is not on the server
      const reply = await waitForButtonConfirm(
        context,
        { content: "User not on server, forceban instead?" },
        { confirmText: "Yes", cancelText: "No", restrictToId: author.id },
      );

      if (!reply) {
        pluginData.state.common.sendErrorMessage(context, "User not on server, ban cancelled by moderator");
        lock.unlock();
        return;
      } else {
        forceban = true;
      }
    } else {
      // Abort if trying to ban user indefinitely if they are already banned indefinitely
      if (!existingTempban && !time) {
        pluginData.state.common.sendErrorMessage(context, `User is already banned indefinitely.`);
        return;
      }

      // Ask the mod if we should update the existing ban
      const reply = await waitForButtonConfirm(
        context,
        { content: "Failed to message the user. Log the warning anyway?" },
        { confirmText: "Yes", cancelText: "No", restrictToId: author.id },
      );

      if (!reply) {
        pluginData.state.common.sendErrorMessage(context, "User already banned, update cancelled by moderator");
        lock.unlock();
        return;
      }

      // Update or add new tempban / remove old tempban
      if (time && time > 0) {
        if (existingTempban) {
          await pluginData.state.tempbans.updateExpiryTime(user.id, time, mod.id);
        } else {
          await pluginData.state.tempbans.addTempban(user.id, time, mod.id);
        }
        const tempban = (await pluginData.state.tempbans.findExistingTempbanForUserId(user.id))!;
        registerExpiringTempban(tempban);
      } else if (existingTempban) {
        clearExpiringTempban(existingTempban);
        pluginData.state.tempbans.clear(user.id);
      }

      // Create a new case for the updated ban since we never stored the old case id and log the action
      const casesPlugin = pluginData.getPlugin(CasesPlugin);
      const createdCase = await casesPlugin.createCase({
        modId: mod.id,
        type: CaseTypes.Ban,
        userId: user.id,
        reason: formattedReason,
        noteDetails: [`Ban updated to ${time ? humanizeDuration(time) : "indefinite"}`],
      });
      if (time) {
        pluginData.getPlugin(LogsPlugin).logMemberTimedBan({
          mod: mod.user,
          user,
          caseNumber: createdCase.case_number,
          reason: formattedReason,
          banTime: humanizeDuration(time),
        });
      } else {
        pluginData.getPlugin(LogsPlugin).logMemberBan({
          mod: mod.user,
          user,
          caseNumber: createdCase.case_number,
          reason: formattedReason,
        });
      }

      pluginData.state.common.sendSuccessMessage(
        context,
        `Ban updated to ${time ? "expire in " + humanizeDuration(time) + " from now" : "indefinite"}`,
      );
      lock.unlock();
      return;
    }
  }

  // Make sure we're allowed to ban this member if they are on the server
  if (!forceban && !canActOn(pluginData, author, memberToBan!)) {
    const ourLevel = getMemberLevel(pluginData, author);
    const targetLevel = getMemberLevel(pluginData, memberToBan!);
    pluginData.state.common.sendErrorMessage(
      context,
      `Cannot ban: target permission level is equal or higher to yours, ${targetLevel} >= ${ourLevel}`,
    );
    lock.unlock();
    return;
  }

  const matchingConfig = await pluginData.config.getMatchingConfig({
    member: author,
    channel: await getContextChannel(context),
  });
  const deleteMessageDays = deleteDays ?? matchingConfig.ban_delete_message_days;
  const banResult = await banUserId(
    pluginData,
    user.id,
    formattedReason,
    formattedReasonWithAttachments,
    {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: mod.id !== author.id ? author.id : undefined,
      },
      deleteMessageDays,
      modId: mod.id,
    },
    time ?? undefined,
  );

  if (banResult.status === "failed") {
    pluginData.state.common.sendErrorMessage(context, `Failed to ban member: ${banResult.error}`);
    lock.unlock();
    return;
  }

  let forTime = "";
  if (time && time > 0) {
    forTime = `for ${humanizeDuration(time)} `;
  }

  // Confirm the action to the moderator
  let response = "";
  if (!forceban) {
    response = `Banned **${renderUsername(user)}** ${forTime}(Case #${banResult.case.case_number})`;
    if (banResult.notifyResult.text) response += ` (${banResult.notifyResult.text})`;
  } else {
    response = `Member forcebanned ${forTime}(Case #${banResult.case.case_number})`;
  }

  lock.unlock();
  pluginData.state.common.sendSuccessMessage(context, response);
}
