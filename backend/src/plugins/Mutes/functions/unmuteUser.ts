import { Snowflake } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { resolveMember, resolveUser, stripObjectToScalars } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseArgs } from "../../Cases/types";
import { MutesPluginType, UnmuteResult } from "../types";
import { memberHasMutedRole } from "./memberHasMutedRole";

export async function unmuteUser(
  pluginData: GuildPluginData<MutesPluginType>,
  userId: string,
  unmuteTime?: number,
  caseArgs: Partial<CaseArgs> = {},
): Promise<UnmuteResult | null> {
  const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(userId);
  const user = await resolveUser(pluginData.client, userId);
  const member = await resolveMember(pluginData.client, pluginData.guild, userId); // Grab the fresh member so we don't have stale role info
  const modId = caseArgs.modId || pluginData.client.user!.id;

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
      if (muteRole && member.roles.cache.has(muteRole as Snowflake)) {
        await member.roles.remove(muteRole as Snowflake);
      }
      if (existingMute?.roles_to_restore) {
        const guildRoles = pluginData.guild.roles.cache;
        let newRoles: string[] = member.roles.cache.keyArray();
        newRoles = muteRole && newRoles.includes(muteRole) ? newRoles.splice(newRoles.indexOf(muteRole), 1) : newRoles;
        for (const toRestore of existingMute.roles_to_restore) {
          if (guildRoles.has(toRestore as Snowflake) && toRestore !== muteRole) newRoles.push(toRestore);
        }
        await member.roles.set(newRoles as Snowflake[]);
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
  const mod = pluginData.client.users.fetch(modId as Snowflake);
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
