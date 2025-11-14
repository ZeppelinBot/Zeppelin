import { Attachment, ChatInputCommandInteraction, GuildMember, Message, User } from "discord.js";
import { GuildPluginData } from "vety";
import { ERRORS, RecoverablePluginError } from "../../../../RecoverablePluginError.js";
import { humanizeDuration } from "../../../../humanizeDuration.js";
import { logger } from "../../../../logger.js";
import {
  UnknownUser,
  UserNotificationMethod,
  asSingleLine,
  isDiscordAPIError,
  renderUsername,
} from "../../../../utils.js";
import { MutesPlugin } from "../../../Mutes/MutesPlugin.js";
import { MuteResult } from "../../../Mutes/types.js";
import { handleAttachmentLinkDetectionAndGetRestriction } from "../../functions/attachmentLinkReaction.js";
import {
  formatReasonWithAttachments,
  formatReasonWithMessageLinkForAttachments,
} from "../../functions/formatReasonForAttachments.js";
import { ModActionsPluginType } from "../../types.js";

/**
 * The actual function run by both !mute and !forcemute.
 * The only difference between the two commands is in target member validation.
 */
export async function actualMuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  user: User | UnknownUser,
  attachments: Attachment[],
  mod: GuildMember,
  ppId?: string,
  time?: number,
  reason?: string | null,
  contactMethods?: UserNotificationMethod[],
) {
  if (await handleAttachmentLinkDetectionAndGetRestriction(pluginData, context, reason)) {
    return;
  }

  const timeUntilUnmute = time && humanizeDuration(time);
  const formattedReason =
    reason || attachments.length > 0
      ? await formatReasonWithMessageLinkForAttachments(pluginData, reason ?? "", context, attachments)
      : undefined;
  const formattedReasonWithAttachments =
    reason || attachments.length > 0 ? formatReasonWithAttachments(reason ?? "", attachments) : undefined;

  let muteResult: MuteResult;
  const mutesPlugin = pluginData.getPlugin(MutesPlugin);

  try {
    muteResult = await mutesPlugin.muteUser(user.id, time, formattedReason, formattedReasonWithAttachments, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId,
      },
    });
  } catch (e) {
    if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
      pluginData.state.common.sendErrorMessage(context, "Could not mute the user: no mute role set in config");
    } else if (isDiscordAPIError(e) && e.code === 10007) {
      pluginData.state.common.sendErrorMessage(context, "Could not mute the user: unknown member");
    } else {
      logger.error(`Failed to mute user ${user.id}: ${e.stack}`);
      if (user.id == null) {
        // FIXME: Debug
        // tslint:disable-next-line:no-console
        console.trace("[DEBUG] Null user.id for mute");
      }
      pluginData.state.common.sendErrorMessage(context, "Could not mute the user");
    }

    return;
  }

  // Confirm the action to the moderator
  let response: string;
  if (time) {
    if (muteResult.updatedExistingMute) {
      response = asSingleLine(`
        Updated **${renderUsername(user)}**'s
        mute to ${timeUntilUnmute} (Case #${muteResult.case.case_number})
      `);
    } else {
      response = asSingleLine(`
        Muted **${renderUsername(user)}**
        for ${timeUntilUnmute} (Case #${muteResult.case.case_number})
      `);
    }
  } else {
    if (muteResult.updatedExistingMute) {
      response = asSingleLine(`
        Updated **${renderUsername(user)}**'s
        mute to indefinite (Case #${muteResult.case.case_number})
      `);
    } else {
      response = asSingleLine(`
        Muted **${renderUsername(user)}**
        indefinitely (Case #${muteResult.case.case_number})
      `);
    }
  }

  if (muteResult.notifyResult.text) response += ` (${muteResult.notifyResult.text})`;
  pluginData.state.common.sendSuccessMessage(context, response);
}
