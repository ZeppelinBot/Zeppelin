import { GuildMember } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { LogType } from "../../../data/LogType.js";
import { renderTemplate, TemplateParseError, TemplateSafeValueContainer } from "../../../templateFormatter.js";
import {
  createUserNotificationError,
  notifyUser,
  resolveUser,
  ucfirst,
  UserNotificationResult,
} from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { IgnoredEventType, KickOptions, KickResult, ModActionsPluginType } from "../types.js";
import { getDefaultContactMethods } from "./getDefaultContactMethods.js";
import { ignoreEvent } from "./ignoreEvent.js";

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
  if (reason && member) {
    const contactMethods = kickOptions?.contactMethods
      ? kickOptions.contactMethods
      : getDefaultContactMethods(pluginData, "kick");

    if (contactMethods.length) {
      if (config.kick_message) {
        let kickMessage: string;
        try {
          kickMessage = await renderTemplate(
            config.kick_message,
            new TemplateSafeValueContainer({
              guildName: pluginData.guild.name,
              reason,
              moderator: kickOptions.caseArgs?.modId
                ? userToTemplateSafeUser(await resolveUser(pluginData.client, kickOptions.caseArgs.modId))
                : null,
            }),
          );
        } catch (err) {
          if (err instanceof TemplateParseError) {
            return {
              status: "failed",
              error: `Invalid kick_message format: ${err.message}`,
            };
          }
          throw err;
        }

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
    await member.kick(reason ?? undefined);
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
  pluginData.getPlugin(LogsPlugin).logMemberKick({
    mod,
    user: member.user,
    caseNumber: createdCase.case_number,
    reason: reason ?? "",
  });

  pluginData.state.events.emit("kick", member.id, reason, kickOptions.isAutomodAction);

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
