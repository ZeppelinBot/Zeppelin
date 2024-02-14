import { Attachment, ChatInputCommandInteraction, GuildMember, TextBasedChannel, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { ERRORS, RecoverablePluginError } from "../../../../RecoverablePluginError";
import { logger } from "../../../../logger";
import { sendErrorMessage, sendSuccessMessage } from "../../../../pluginUtils";
import {
  UnknownUser,
  UserNotificationMethod,
  asSingleLine,
  isDiscordAPIError,
  renderUserUsername,
} from "../../../../utils";
import { MutesPlugin } from "../../../Mutes/MutesPlugin";
import { MuteResult } from "../../../Mutes/types";
import { ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";

/**
 * The actual function run by both !mute and !forcemute.
 * The only difference between the two commands is in target member validation.
 */
export async function actualMuteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  user: User | UnknownUser,
  attachments: Array<Attachment>,
  mod: GuildMember,
  ppId?: string,
  time?: number,
  reason?: string,
  contactMethods?: UserNotificationMethod[],
) {
  const timeUntilUnmute = time && humanizeDuration(time);
  const formattedReason = reason ? formatReasonWithAttachments(reason, attachments) : undefined;

  let muteResult: MuteResult;
  const mutesPlugin = pluginData.getPlugin(MutesPlugin);

  try {
    muteResult = await mutesPlugin.muteUser(user.id, time, formattedReason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId,
      },
    });
  } catch (e) {
    if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
      sendErrorMessage(pluginData, context, "Could not mute the user: no mute role set in config");
    } else if (isDiscordAPIError(e) && e.code === 10007) {
      sendErrorMessage(pluginData, context, "Could not mute the user: unknown member");
    } else {
      logger.error(`Failed to mute user ${user.id}: ${e.stack}`);
      if (user.id == null) {
        // FIXME: Debug
        // tslint:disable-next-line:no-console
        console.trace("[DEBUG] Null user.id for mute");
      }
      sendErrorMessage(pluginData, context, "Could not mute the user");
    }

    return;
  }

  // Confirm the action to the moderator
  let response: string;
  if (time) {
    if (muteResult.updatedExistingMute) {
      response = asSingleLine(`
        Updated **${renderUserUsername(user)}**'s
        mute to ${timeUntilUnmute} (Case #${muteResult.case.case_number})
      `);
    } else {
      response = asSingleLine(`
        Muted **${renderUserUsername(user)}**
        for ${timeUntilUnmute} (Case #${muteResult.case.case_number})
      `);
    }
  } else {
    if (muteResult.updatedExistingMute) {
      response = asSingleLine(`
        Updated **${renderUserUsername(user)}**'s
        mute to indefinite (Case #${muteResult.case.case_number})
      `);
    } else {
      response = asSingleLine(`
        Muted **${renderUserUsername(user)}**
        indefinitely (Case #${muteResult.case.case_number})
      `);
    }
  }

  if (muteResult.notifyResult.text) response += ` (${muteResult.notifyResult.text})`;
  sendSuccessMessage(pluginData, context, response);
}
