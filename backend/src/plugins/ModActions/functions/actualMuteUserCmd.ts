import { GuildMember, Message, TextChannel, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { logger } from "../../../logger";
import { hasPermission, sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { asSingleLine, isDiscordAPIError, UnknownUser } from "../../../utils";
import { MutesPlugin } from "../../Mutes/MutesPlugin";
import { MuteResult } from "../../Mutes/types";
import { ModActionsPluginType } from "../types";
import { formatReasonWithAttachments } from "./formatReasonWithAttachments";
import { readContactMethodsFromArgs } from "./readContactMethodsFromArgs";

/**
 * The actual function run by both !mute and !forcemute.
 * The only difference between the two commands is in target member validation.
 */
export async function actualMuteUserCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  user: User | UnknownUser,
  msg: Message,
  args: { time?: number; reason?: string; mod: GuildMember; notify?: string; "notify-channel"?: TextChannel },
) {
  // The moderator who did the action is the message author or, if used, the specified -mod
  let mod: GuildMember = msg.member!;
  let pp: User | null = null;

  if (args.mod) {
    if (!(await hasPermission(pluginData, "can_act_as_other", { message: msg }))) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "You don't have permission to use -mod");
      return;
    }

    mod = args.mod;
    pp = msg.author;
  }

  const timeUntilUnmute = args.time && humanizeDuration(args.time);
  const reason = args.reason ? formatReasonWithAttachments(args.reason, msg.attachments.array()) : undefined;

  let muteResult: MuteResult;
  const mutesPlugin = pluginData.getPlugin(MutesPlugin);

  let contactMethods;
  try {
    contactMethods = readContactMethodsFromArgs(args);
  } catch (e) {
    sendErrorMessage(pluginData, msg.channel as TextChannel, e.message);
    return;
  }

  try {
    muteResult = await mutesPlugin.muteUser(user.id, args.time, reason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: pp ? pp.id : undefined,
      },
    });
  } catch (e) {
    if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Could not mute the user: no mute role set in config");
    } else if (isDiscordAPIError(e) && e.code === 10007) {
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Could not mute the user: unknown member");
    } else {
      logger.error(`Failed to mute user ${user.id}: ${e.stack}`);
      if (user.id == null) {
        // tslint-disable-next-line:no-console
        console.trace("[DEBUG] Null user.id for mute");
      }
      sendErrorMessage(pluginData, msg.channel as TextChannel, "Could not mute the user");
    }

    return;
  }

  // Confirm the action to the moderator
  let response;
  if (args.time) {
    if (muteResult.updatedExistingMute) {
      response = asSingleLine(`
        Updated **${user.username}#${user.discriminator}**'s
        mute to ${timeUntilUnmute} (Case #${muteResult.case.case_number})
      `);
    } else {
      response = asSingleLine(`
        Muted **${user.username}#${user.discriminator}**
        for ${timeUntilUnmute} (Case #${muteResult.case.case_number})
      `);
    }
  } else {
    if (muteResult.updatedExistingMute) {
      response = asSingleLine(`
        Updated **${user.username}#${user.discriminator}**'s
        mute to indefinite (Case #${muteResult.case.case_number})
      `);
    } else {
      response = asSingleLine(`
        Muted **${user.username}#${user.discriminator}**
        indefinitely (Case #${muteResult.case.case_number})
      `);
    }
  }

  if (muteResult.notifyResult.text) response += ` (${muteResult.notifyResult.text})`;
  sendSuccessMessage(pluginData, msg.channel as TextChannel, response);
}
