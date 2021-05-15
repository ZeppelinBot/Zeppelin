import { GuildPluginData } from "knub";
import { ModActionsPluginType, WarnOptions, WarnResult } from "../types";
import { Member } from "eris";
import { getDefaultContactMethods } from "./getDefaultContactMethods";
import {
  createUserNotificationError,
  notifyUser,
  resolveUser,
  stripObjectToScalars,
  ucfirst,
  UserNotificationResult,
} from "../../../utils";
import { waitForReaction } from "knub/dist/helpers";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { renderTemplate } from "../../../templateFormatter";

export async function warnMember(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: Member,
  reason: string,
  warnOptions: WarnOptions = {},
): Promise<WarnResult> {
  const config = pluginData.config.get();

  let notifyResult: UserNotificationResult;
  if (config.warn_message) {
    const warnMessage = await renderTemplate(config.warn_message, {
      guildName: pluginData.guild.name,
      reason,
      moderator: warnOptions.caseArgs?.modId
        ? stripObjectToScalars(await resolveUser(pluginData.client, warnOptions.caseArgs.modId))
        : {},
    });
    const contactMethods = warnOptions?.contactMethods
      ? warnOptions.contactMethods
      : getDefaultContactMethods(pluginData, "warn");
    notifyResult = await notifyUser(member.user, warnMessage, contactMethods);
  } else {
    notifyResult = createUserNotificationError("No warn message specified in config");
  }

  if (!notifyResult.success) {
    if (warnOptions.retryPromptChannel && pluginData.guild.channels.has(warnOptions.retryPromptChannel.id)) {
      const failedMsg = await warnOptions.retryPromptChannel.createMessage(
        "Failed to message the user. Log the warning anyway?",
      );
      const reply = await waitForReaction(pluginData.client, failedMsg, ["✅", "❌"], warnOptions.caseArgs?.modId);
      failedMsg.delete();
      if (!reply || reply.name === "❌") {
        return {
          status: "failed",
          error: "Failed to message user",
        };
      }
    } else {
      return {
        status: "failed",
        error: "Failed to message user",
      };
    }
  }

  const modId = warnOptions.caseArgs?.modId ?? pluginData.client.user.id;

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    ...(warnOptions.caseArgs || {}),
    userId: member.id,
    modId,
    type: CaseTypes.Warn,
    reason,
    noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
  });

  const mod = await resolveUser(pluginData.client, modId);
  pluginData.state.serverLogs.log(LogType.MEMBER_WARN, {
    mod: stripObjectToScalars(mod),
    member: stripObjectToScalars(member, ["user", "roles"]),
    caseNumber: createdCase.case_number,
    reason,
  });

  pluginData.state.events.emit("warn", member.id, reason, warnOptions.isAutomodAction);

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
