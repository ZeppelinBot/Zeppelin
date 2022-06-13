import { Snowflake, TextChannel, User } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { CaseTypes } from "../../../data/CaseTypes";
import { Case } from "../../../data/entities/Case";
import { LogsPlugin } from "../../../plugins/Logs/LogsPlugin";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter";
import {
  notifyUser,
  resolveMember,
  resolveUser,
  ucfirst,
  UserNotificationMethod,
  UserNotificationResult,
} from "../../../utils";
import { muteLock } from "../../../utils/lockNameHelpers";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { MuteOptions, MutesPluginType } from "../types";
import { Mute } from "../../../data/entities/Mute";
import { registerExpiringMute } from "../../../data/loops/expiringMutesLoop";

/**
 * TODO: Clean up this function
 */
export async function muteUser(
  pluginData: GuildPluginData<MutesPluginType>,
  userId: string,
  muteTime?: number,
  reason?: string,
  muteOptions: MuteOptions = {},
  removeRolesOnMuteOverride: boolean | string[] | null = null,
  restoreRolesOnMuteOverride: boolean | string[] | null = null,
) {
  const lock = await pluginData.locks.acquire(muteLock({ id: userId }));

  const muteRole = pluginData.config.get().mute_role;
  if (!muteRole) {
    lock.unlock();
    throw new RecoverablePluginError(ERRORS.NO_MUTE_ROLE_IN_CONFIG);
  }

  const timeUntilUnmute = muteTime ? humanizeDuration(muteTime) : "indefinite";

  // No mod specified -> mark Zeppelin as the mod
  if (!muteOptions.caseArgs?.modId) {
    muteOptions.caseArgs = muteOptions.caseArgs ?? {};
    muteOptions.caseArgs.modId = pluginData.client.user!.id;
  }

  const user = await resolveUser(pluginData.client, userId);
  if (!user.id) {
    lock.unlock();
    throw new RecoverablePluginError(ERRORS.INVALID_USER);
  }

  const member = await resolveMember(pluginData.client, pluginData.guild, user.id, true); // Grab the fresh member so we don't have stale role info
  const config = await pluginData.config.getMatchingConfig({ member, userId });

  let rolesToRestore: string[] = [];
  if (member) {
    const logs = pluginData.getPlugin(LogsPlugin);
    // remove and store any roles to be removed/restored
    const currentUserRoles = [...member.roles.cache.keys()];
    let newRoles: string[] = currentUserRoles;
    const removeRoles = removeRolesOnMuteOverride ?? config.remove_roles_on_mute;
    const restoreRoles = restoreRolesOnMuteOverride ?? config.restore_roles_on_mute;

    // remove roles
    if (!Array.isArray(removeRoles)) {
      if (removeRoles) {
        // exclude managed roles from being removed
        const managedRoles = pluginData.guild.roles.cache.filter((x) => x.managed).map((y) => y.id);
        newRoles = currentUserRoles.filter((r) => managedRoles.includes(r));
        await member.roles.set(newRoles as Snowflake[]);
      }
    } else {
      newRoles = currentUserRoles.filter((x) => !(<string[]>removeRoles).includes(x));
      await member.roles.set(newRoles as Snowflake[]);
    }

    // set roles to be restored
    if (!Array.isArray(restoreRoles)) {
      if (restoreRoles) {
        rolesToRestore = currentUserRoles;
      }
    } else {
      rolesToRestore = currentUserRoles.filter((x) => (<string[]>restoreRoles).includes(x));
    }

    // Apply mute role if it's missing
    if (!currentUserRoles.includes(muteRole as Snowflake)) {
      try {
        await member.roles.add(muteRole as Snowflake);
      } catch (e) {
        const actualMuteRole = pluginData.guild.roles.cache.get(muteRole as Snowflake);
        if (!actualMuteRole) {
          lock.unlock();
          logs.logBotAlert({
            body: `Cannot mute users, specified mute role Id is invalid`,
          });
          throw new RecoverablePluginError(ERRORS.INVALID_MUTE_ROLE_ID);
        }

        const zep = await resolveMember(pluginData.client, pluginData.guild, pluginData.client.user!.id);
        const zepRoles = pluginData.guild.roles.cache.filter((x) => zep!.roles.cache.has(x.id));
        // If we have roles and one of them is above the muted role, throw generic error
        if (zepRoles.size >= 0 && zepRoles.some((zepRole) => zepRole.position > actualMuteRole.position)) {
          lock.unlock();
          logs.logBotAlert({
            body: `Cannot mute user ${member.id}: ${e}`,
          });
          throw e;
        } else {
          // Otherwise, throw error that mute role is above zeps roles
          lock.unlock();
          logs.logBotAlert({
            body: `Cannot mute users, specified mute role is above Zeppelin in the role hierarchy`,
          });
          throw new RecoverablePluginError(ERRORS.MUTE_ROLE_ABOVE_ZEP, pluginData.guild);
        }
      }
    }

    // If enabled, move the user to the mute voice channel (e.g. afk - just to apply the voice perms from the mute role)
    const cfg = pluginData.config.get();
    const moveToVoiceChannel = cfg.kick_from_voice_channel ? null : cfg.move_to_voice_channel;
    if (moveToVoiceChannel || cfg.kick_from_voice_channel) {
      // TODO: Add back the voiceState check once we figure out how to get voice state for guild members that are loaded on-demand
      try {
        await member.edit({ channel: moveToVoiceChannel as Snowflake });
      } catch {} // tslint:disable-line
    }
  }

  // If the user is already muted, update the duration of their existing mute
  const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(user.id);
  let finalMute: Mute;
  let notifyResult: UserNotificationResult = { method: null, success: true };

  if (existingMute) {
    if (existingMute.roles_to_restore?.length || rolesToRestore?.length) {
      rolesToRestore = Array.from(new Set([...existingMute.roles_to_restore, ...rolesToRestore]));
    }
    await pluginData.state.mutes.updateExpiryTime(user.id, muteTime, rolesToRestore);
    finalMute = (await pluginData.state.mutes.findExistingMuteForUserId(user.id))!;
  } else {
    finalMute = await pluginData.state.mutes.addMute(user.id, muteTime, rolesToRestore);
  }

  registerExpiringMute(finalMute);

  const template = existingMute
    ? config.update_mute_message
    : muteTime
    ? config.timed_mute_message
    : config.mute_message;

  const muteMessage =
    template &&
    (await renderTemplate(
      template,
      new TemplateSafeValueContainer({
        guildName: pluginData.guild.name,
        reason: reason || "None",
        time: timeUntilUnmute,
        moderator: muteOptions.caseArgs?.modId
          ? userToTemplateSafeUser(await resolveUser(pluginData.client, muteOptions.caseArgs.modId))
          : null,
      }),
    ));

  if (muteMessage && user instanceof User) {
    let contactMethods: UserNotificationMethod[] = [];

    if (muteOptions?.contactMethods) {
      contactMethods = muteOptions.contactMethods;
    } else {
      const useDm = existingMute ? config.dm_on_update : config.dm_on_mute;
      if (useDm) {
        contactMethods.push({ type: "dm" });
      }

      const useChannel = existingMute ? config.message_on_update : config.message_on_mute;
      const channel = config.message_channel
        ? pluginData.guild.channels.cache.get(config.message_channel as Snowflake)
        : null;
      if (useChannel && channel?.isText()) {
        contactMethods.push({ type: "channel", channel });
      }
    }

    notifyResult = await notifyUser(user, muteMessage, contactMethods);
  }

  // Create/update a case
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  let theCase: Case | undefined =
    existingMute && existingMute.case_id ? await pluginData.state.cases.find(existingMute.case_id) : undefined;

  if (theCase) {
    // Update old case
    const noteDetails = [`Mute updated to ${muteTime ? timeUntilUnmute : "indefinite"}`];
    const reasons = reason ? [reason] : [];
    if (muteOptions.caseArgs?.extraNotes) {
      reasons.push(...muteOptions.caseArgs.extraNotes);
    }
    for (const noteReason of reasons) {
      await casesPlugin.createCaseNote({
        caseId: existingMute!.case_id,
        modId: muteOptions.caseArgs?.modId,
        body: noteReason,
        noteDetails,
        postInCaseLogOverride: muteOptions.caseArgs?.postInCaseLogOverride,
      });
    }
  } else {
    // Create new case
    const noteDetails = [`Muted ${muteTime ? `for ${timeUntilUnmute}` : "indefinitely"}`];
    if (notifyResult.text) {
      noteDetails.push(ucfirst(notifyResult.text));
    }

    theCase = await casesPlugin.createCase({
      ...(muteOptions.caseArgs || {}),
      userId,
      modId: muteOptions.caseArgs?.modId,
      type: CaseTypes.Mute,
      reason,
      noteDetails,
    });
    await pluginData.state.mutes.setCaseId(user.id, theCase.id);
  }

  // Log the action
  const mod = await resolveUser(pluginData.client, muteOptions.caseArgs?.modId);
  if (muteTime) {
    pluginData.getPlugin(LogsPlugin).logMemberTimedMute({
      mod,
      user,
      time: timeUntilUnmute,
      caseNumber: theCase.case_number,
      reason: reason ?? "",
    });
  } else {
    pluginData.getPlugin(LogsPlugin).logMemberMute({
      mod,
      user,
      caseNumber: theCase.case_number,
      reason: reason ?? "",
    });
  }

  lock.unlock();

  pluginData.state.events.emit("mute", user.id, reason, muteOptions.isAutomodAction);

  return {
    case: theCase,
    notifyResult,
    updatedExistingMute: !!existingMute,
  };
}
