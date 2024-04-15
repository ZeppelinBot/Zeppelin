import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { getMemberLevel } from "knub/helpers";
import { CaseTypes } from "../../../../data/CaseTypes";
import { clearExpiringTempban, registerExpiringTempban } from "../../../../data/loops/expiringTempbansLoop";
import { canActOn, getContextChannel } from "../../../../pluginUtils";
import { UnknownUser, UserNotificationMethod, renderUsername, resolveMember } from "../../../../utils";
import { banLock } from "../../../../utils/lockNameHelpers";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { ModActionsPluginType } from "../../types";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction";
import { banUserId } from "../../functions/banUserId";
import { formatReasonWithAttachments, formatReasonWithMessageLinkForAttachments } from "../../functions/formatReasonForAttachments";
import { isBanned } from "../../functions/isBanned";

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
        pluginData.state.common.sendErrorMessage(
          context,
          "User already banned, update cancelled by moderator"
        );
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
