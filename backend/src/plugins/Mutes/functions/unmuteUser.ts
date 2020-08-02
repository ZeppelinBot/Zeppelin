import { PluginData } from "knub";
import { MutesPluginType, UnmuteResult } from "../types";
import { CaseArgs } from "../../Cases/types";
import { resolveUser, stripObjectToScalars, resolveMember } from "../../../utils";
import { memberHasMutedRole } from "./memberHasMutedRole";
import humanizeDuration from "humanize-duration";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";

export async function unmuteUser(
  pluginData: PluginData<MutesPluginType>,
  userId: string,
  unmuteTime: number = null,
  caseArgs: Partial<CaseArgs> = {},
): Promise<UnmuteResult> {
  const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(userId);
  const user = await resolveUser(pluginData.client, userId);
  const member = await resolveMember(pluginData.client, pluginData.guild, userId); // Grab the fresh member so we don't have stale role info

  if (!existingMute && !memberHasMutedRole(pluginData, member)) return;

  if (unmuteTime) {
    // Schedule timed unmute (= just set the mute's duration)
    if (!existingMute) {
      await pluginData.state.mutes.addMute(userId, unmuteTime);
    } else {
      await pluginData.state.mutes.updateExpiryTime(userId, unmuteTime);
    }
  } else {
    // Unmute immediately
    if (member) {
      const muteRole = pluginData.config.get().mute_role;
      if (member.roles.includes(muteRole)) {
        await member.removeRole(muteRole);
      }
    } else {
      console.warn(
        `Member ${userId} not found in guild ${pluginData.guild.name} (${pluginData.guild.id}) when attempting to unmute`,
      );
    }
    if (existingMute) {
      await pluginData.state.mutes.clear(userId);
    }
  }

  const timeUntilUnmute = unmuteTime && humanizeDuration(unmuteTime);

  // Create a case
  const noteDetails = [];
  if (unmuteTime) {
    noteDetails.push(`Scheduled unmute in ${timeUntilUnmute}`);
  } else {
    noteDetails.push(`Unmuted immediately`);
  }
  if (!existingMute) {
    noteDetails.push(`Removed external mute`);
  }

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    ...caseArgs,
    userId,
    modId: caseArgs.modId,
    type: CaseTypes.Unmute,
    noteDetails,
  });

  // Log the action
  const mod = pluginData.client.users.get(caseArgs.modId);
  if (unmuteTime) {
    pluginData.state.serverLogs.log(LogType.MEMBER_TIMED_UNMUTE, {
      mod: stripObjectToScalars(mod),
      user: stripObjectToScalars(user),
      caseNumber: createdCase.case_number,
      time: timeUntilUnmute,
      reason: caseArgs.reason,
    });
  } else {
    pluginData.state.serverLogs.log(LogType.MEMBER_UNMUTE, {
      mod: stripObjectToScalars(mod),
      user: stripObjectToScalars(user),
      caseNumber: createdCase.case_number,
      reason: caseArgs.reason,
    });
  }

  return {
    case: createdCase,
  };
}
