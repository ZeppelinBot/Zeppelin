import { PluginData } from "knub";
import { MuteOptions, MutesPluginType } from "../types";
import { ERRORS, RecoverablePluginError } from "../../../RecoverablePluginError";
import humanizeDuration from "humanize-duration";
import {
  notifyUser,
  resolveMember,
  resolveUser,
  stripObjectToScalars,
  ucfirst,
  UserNotificationResult,
} from "../../../utils";
import { renderTemplate } from "../../../templateFormatter";
import { TextChannel, User } from "eris";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";

export async function muteUser(
  pluginData: PluginData<MutesPluginType>,
  userId: string,
  muteTime: number = null,
  reason: string = null,
  muteOptions: MuteOptions = {},
) {
  const lock = await pluginData.locks.acquire(`mute-${userId}`);

  const muteRole = pluginData.config.get().mute_role;
  if (!muteRole) {
    lock.unlock();
    throw new RecoverablePluginError(ERRORS.NO_MUTE_ROLE_IN_CONFIG);
  }

  const timeUntilUnmute = muteTime ? humanizeDuration(muteTime) : "indefinite";

  // No mod specified -> mark Zeppelin as the mod
  if (!muteOptions.caseArgs?.modId) {
    muteOptions.caseArgs = muteOptions.caseArgs ?? {};
    muteOptions.caseArgs.modId = pluginData.client.user.id;
  }

  const user = await resolveUser(pluginData.client, userId);
  const member = await pluginData.client.getRESTGuildMember(pluginData.guild.id, user.id); // Grab the fresh member so we don't have stale role info
  const config = pluginData.config.getMatchingConfig({ member, userId });

  if (member) {
    // Apply mute role if it's missing
    if (!member.roles.includes(muteRole)) {
      await member.addRole(muteRole);
    }

    // If enabled, move the user to the mute voice channel (e.g. afk - just to apply the voice perms from the mute role)
    const moveToVoiceChannelId = pluginData.config.get().move_to_voice_channel;
    if (moveToVoiceChannelId) {
      // TODO: Add back the voiceState check once we figure out how to get voice state for guild members that are loaded on-demand
      try {
        await member.edit({ channelID: moveToVoiceChannelId });
      } catch (e) {} // tslint:disable-line
    }
  }

  // If the user is already muted, update the duration of their existing mute
  const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(user.id);
  let notifyResult: UserNotificationResult = { method: null, success: true };

  if (existingMute) {
    await pluginData.state.mutes.updateExpiryTime(user.id, muteTime);
  } else {
    await pluginData.state.mutes.addMute(user.id, muteTime);
  }

  const template = existingMute
    ? config.update_mute_message
    : muteTime
    ? config.timed_mute_message
    : config.mute_message;

  const muteMessage =
    template &&
    (await renderTemplate(template, {
      guildName: pluginData.guild.name,
      reason: reason || "None",
      time: timeUntilUnmute,
    }));

  if (muteMessage && user instanceof User) {
    let contactMethods = [];

    if (muteOptions?.contactMethods) {
      contactMethods = muteOptions.contactMethods;
    } else {
      const useDm = existingMute ? config.dm_on_update : config.dm_on_mute;
      if (useDm) {
        contactMethods.push({ type: "dm" });
      }

      const useChannel = existingMute ? config.message_on_update : config.message_on_mute;
      const channel = config.message_channel && pluginData.guild.channels.get(config.message_channel);
      if (useChannel && channel instanceof TextChannel) {
        contactMethods.push({ type: "channel", channel });
      }
    }

    notifyResult = await notifyUser(user, muteMessage, contactMethods);
  }

  // Create/update a case
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  let theCase;

  if (existingMute && existingMute.case_id) {
    // Update old case
    // Since mutes can often have multiple notes (extraNotes), we won't post each case note individually,
    // but instead we'll post the entire case afterwards
    theCase = await pluginData.state.cases.find(existingMute.case_id);
    const noteDetails = [`Mute updated to ${muteTime ? timeUntilUnmute : "indefinite"}`];
    const reasons = [reason, ...(muteOptions.caseArgs?.extraNotes || [])];
    for (const noteReason of reasons) {
      await casesPlugin.createCaseNote({
        caseId: existingMute.case_id,
        modId: muteOptions.caseArgs?.modId,
        body: noteReason,
        noteDetails,
        postInCaseLogOverride: false,
      });
    }

    if (muteOptions.caseArgs?.postInCaseLogOverride !== false) {
      casesPlugin.postCaseToCaseLogChannel(existingMute.case_id);
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
    pluginData.state.serverLogs.log(LogType.MEMBER_TIMED_MUTE, {
      mod: stripObjectToScalars(mod),
      user: stripObjectToScalars(user),
      time: timeUntilUnmute,
      reason,
    });
  } else {
    pluginData.state.serverLogs.log(LogType.MEMBER_MUTE, {
      mod: stripObjectToScalars(mod),
      user: stripObjectToScalars(user),
      reason,
    });
  }

  lock.unlock();

  return {
    case: theCase,
    notifyResult,
    updatedExistingMute: !!existingMute,
  };
}
