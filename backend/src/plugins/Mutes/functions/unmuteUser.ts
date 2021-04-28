import { GuildPluginData } from "knub";
import { MutesPluginType, UnmuteResult } from "../types";
import { CaseArgs } from "../../Cases/types";
import { resolveUser, stripObjectToScalars, resolveMember } from "../../../utils";
import { memberHasMutedRole } from "./memberHasMutedRole";
import humanizeDuration from "humanize-duration";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { MemberOptions } from "eris";
import { memberRolesLock } from "../../../utils/lockNameHelpers";

export async function unmuteUser(
  pluginData: GuildPluginData<MutesPluginType>,
  userId: string,
  unmuteTime?: number,
  caseArgs: Partial<CaseArgs> = {},
): Promise<UnmuteResult | null> {
  const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(userId);
  const user = await resolveUser(pluginData.client, userId);
  const member = await resolveMember(pluginData.client, pluginData.guild, userId); // Grab the fresh member so we don't have stale role info
  const modId = caseArgs.modId || pluginData.client.user.id;

  if (!existingMute && member && !memberHasMutedRole(pluginData, member)) return null;

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
      const lock = await pluginData.locks.acquire(memberRolesLock(member));

      const muteRole = pluginData.config.get().mute_role;
      if (muteRole && member.roles.includes(muteRole)) {
        await member.removeRole(muteRole);
        member.roles = member.roles.filter(r => r !== muteRole);
      }
      if (existingMute?.roles_to_restore) {
        const memberOptions: MemberOptions = {};
        const guildRoles = pluginData.guild.roles;
        memberOptions.roles = Array.from(
          new Set([...existingMute.roles_to_restore, ...member.roles.filter(x => x !== muteRole && guildRoles.has(x))]),
        );
        await member.edit(memberOptions);
        member.roles = memberOptions.roles;
      }

      lock.unlock();
    } else {
      // tslint:disable-next-line:no-console
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
  const noteDetails: string[] = [];
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
    modId,
    type: CaseTypes.Unmute,
    noteDetails,
  });

  // Log the action
  const mod = pluginData.client.users.get(modId);
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

  if (!unmuteTime) {
    // If the member was unmuted, not just scheduled to be unmuted, fire the unmute event as well
    // Scheduled unmutes have their event fired in clearExpiredMutes()
    pluginData.state.events.emit("unmute", user.id, caseArgs.reason);
  }

  return {
    case: createdCase,
  };
}
