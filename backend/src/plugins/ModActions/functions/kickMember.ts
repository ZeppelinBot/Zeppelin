import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { renderTemplate } from "../../../templateFormatter";
import {
  createUserNotificationError,
  notifyUser,
  resolveUser,
  stripObjectToScalars,
  ucfirst,
  UserNotificationResult,
} from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { IgnoredEventType, KickOptions, KickResult, ModActionsPluginType } from "../types";
import { getDefaultContactMethods } from "./getDefaultContactMethods";
import { ignoreEvent } from "./ignoreEvent";

/**
 * Kick the specified server member. Generates a case.
 */
export async function kickMember(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
  reason?: string,
  kickOptions: KickOptions = {},
): Promise<KickResult> {
  const config = pluginData.config.get();

  // Attempt to message the user *before* kicking them, as doing it after may not be possible
  let notifyResult: UserNotificationResult = { method: null, success: true };
  if (reason) {
    const contactMethods = kickOptions?.contactMethods
      ? kickOptions.contactMethods
      : getDefaultContactMethods(pluginData, "kick");

    if (contactMethods.length) {
      if (config.kick_message) {
        const kickMessage = await renderTemplate(config.kick_message, {
          guildName: pluginData.guild.name,
          reason,
          moderator: kickOptions.caseArgs?.modId
            ? stripObjectToScalars(await resolveUser(pluginData.client, kickOptions.caseArgs.modId))
            : {},
        });

        notifyResult = await notifyUser(member.user, kickMessage, contactMethods);
      } else {
        notifyResult = createUserNotificationError("No kick message specified in the config");
      }
    }
  }

  // Kick the user
  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_KICK, member.id);
  ignoreEvent(pluginData, IgnoredEventType.Kick, member.id);
  try {
    await member.kick(reason != null ? encodeURIComponent(reason) : undefined);
  } catch (e) {
    return {
      status: "failed",
      error: e.message,
    };
  }

  const modId = kickOptions.caseArgs?.modId || pluginData.client.user!.id;

  // Create a case for this action
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    ...(kickOptions.caseArgs || {}),
    userId: member.id,
    modId,
    type: CaseTypes.Kick,
    reason,
    noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
  });

  // Log the action
  const mod = await resolveUser(pluginData.client, modId);
  pluginData.state.serverLogs.log(LogType.MEMBER_KICK, {
    mod: stripObjectToScalars(mod),
    user: stripObjectToScalars(member.user),
    caseNumber: createdCase.case_number,
    reason,
  });

  pluginData.state.events.emit("kick", member.id, reason, kickOptions.isAutomodAction);

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
