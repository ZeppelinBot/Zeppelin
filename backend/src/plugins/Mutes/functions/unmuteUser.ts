import { Snowflake } from "discord.js";
import { GuildPluginData } from "vety";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { AddMuteParams } from "../../../data/GuildMutes.js";
import { MuteTypes } from "../../../data/MuteTypes.js";
import { Mute } from "../../../data/entities/Mute.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { noop, resolveMember, resolveUser } from "../../../utils.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { CaseArgs } from "../../Cases/types.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { MutesPluginType, UnmuteResult } from "../types.js";
import { clearMute } from "./clearMute.js";
import { getDefaultMuteType } from "./getDefaultMuteType.js";
import { getTimeoutExpiryTime } from "./getTimeoutExpiryTime.js";
import { memberHasMutedRole } from "./memberHasMutedRole.js";

export async function unmuteUser(
  pluginData: GuildPluginData<MutesPluginType>,
  userId: string,
  unmuteTime?: number,
  caseArgs: Partial<CaseArgs> = {},
): Promise<UnmuteResult | null> {
  const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(userId);
  const user = await resolveUser(pluginData.client, userId, "Mutes:unmuteUser");
  const member = await resolveMember(pluginData.client, pluginData.guild, userId, true); // Grab the fresh member so we don't have stale role info
  const modId = caseArgs.modId || pluginData.client.user!.id;

  if (!existingMute && member && !memberHasMutedRole(pluginData, member) && !member?.isCommunicationDisabled()) {
    return null;
  }

  if (unmuteTime) {
    // Schedule timed unmute (= just update the mute's duration)
    const muteExpiresAt = Date.now() + unmuteTime;
    const timeoutExpiresAt = getTimeoutExpiryTime(muteExpiresAt);
    let createdMute: Mute | null = null;

    if (!existingMute) {
      const defaultMuteType = getDefaultMuteType(pluginData);
      const muteParams: AddMuteParams = {
        userId,
        type: defaultMuteType,
        expiresAt: muteExpiresAt,
      };
      if (defaultMuteType === MuteTypes.Role) {
        muteParams.muteRole = pluginData.config.get().mute_role;
      } else {
        muteParams.timeoutExpiresAt = timeoutExpiresAt;
      }
      createdMute = await pluginData.state.mutes.addMute(muteParams);
    } else {
      await pluginData.state.mutes.updateExpiryTime(userId, unmuteTime);
    }

    // Update timeout
    if (member && (existingMute?.type === MuteTypes.Timeout || createdMute?.type === MuteTypes.Timeout)) {
      if (!member.moderatable) return null;

      await member.disableCommunicationUntil(timeoutExpiresAt).catch(noop);
      await pluginData.state.mutes.updateTimeoutExpiresAt(userId, timeoutExpiresAt);
    }
  } else {
    // Unmute immediately
    clearMute(pluginData, existingMute);
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
  const mod = await pluginData.client.users.fetch(modId as Snowflake);
  if (unmuteTime) {
    pluginData.getPlugin(LogsPlugin).logMemberTimedUnmute({
      mod,
      user,
      caseNumber: createdCase.case_number,
      time: timeUntilUnmute,
      reason: caseArgs.reason ?? "",
    });
  } else {
    pluginData.getPlugin(LogsPlugin).logMemberUnmute({
      mod,
      user,
      caseNumber: createdCase.case_number,
      reason: caseArgs.reason ?? "",
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
