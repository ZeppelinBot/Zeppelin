import { Snowflake } from "discord.js";
import humanizeDuration from "humanize-duration";
import { GuildPluginData } from "knub";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { resolveMember, resolveUser } from "../../../utils";
import { memberRolesLock } from "../../../utils/lockNameHelpers";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseArgs } from "../../Cases/types";
import { MutesPluginType, UnmuteResult } from "../types";
import { memberHasMutedRole } from "./memberHasMutedRole";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { clearMute } from "./clearMute";

export async function unmuteUser(
  pluginData: GuildPluginData<MutesPluginType>,
  userId: string,
  unmuteTime?: number,
  caseArgs: Partial<CaseArgs> = {},
): Promise<UnmuteResult | null> {
  const existingMute = await pluginData.state.mutes.findExistingMuteForUserId(userId);
  const user = await resolveUser(pluginData.client, userId);
  const member = await resolveMember(pluginData.client, pluginData.guild, userId, true); // Grab the fresh member so we don't have stale role info
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
