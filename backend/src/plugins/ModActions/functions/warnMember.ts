import { GuildMember, Snowflake } from "discord.js";
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
import { waitForButtonConfirm } from "../../../utils/waitForInteraction";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { ModActionsPluginType, WarnOptions, WarnResult } from "../types";
import { getDefaultContactMethods } from "./getDefaultContactMethods";

export async function warnMember(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
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
    if (warnOptions.retryPromptChannel && pluginData.guild.channels.resolve(warnOptions.retryPromptChannel.id)) {
      const reply = await waitForButtonConfirm(
        warnOptions.retryPromptChannel,
        { content: "Failed to message the user. Log the warning anyway?" },
        { confirmText: "Yes", cancelText: "No", restrictToId: warnOptions.caseArgs?.modId },
      );

      if (!reply) {
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

  const modId = warnOptions.caseArgs?.modId ?? pluginData.client.user!.id;

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    ...(warnOptions.caseArgs || {}),
    userId: member.id,
    modId,
    type: CaseTypes.Warn,
    reason,
    noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
  });

  const mod = await pluginData.guild.members.fetch(modId as Snowflake);
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
