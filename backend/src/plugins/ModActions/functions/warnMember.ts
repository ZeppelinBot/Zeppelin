import { GuildMember, Snowflake, User } from "discord.js";
import { GuildPluginData } from "knub";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects";
import { CaseTypes } from "../../../data/CaseTypes";
import { renderTemplate, TemplateSafeValueContainer } from "../../../templateFormatter";
import {
  createUserNotificationError,
  notifyUser,
  resolveUser,
  ucfirst,
  UnknownUser,
  UserNotificationResult,
} from "../../../utils";
import { waitForButtonConfirm } from "../../../utils/waitForInteraction";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { ModActionsPluginType, WarnOptions, WarnResult } from "../types";
import { getDefaultContactMethods } from "./getDefaultContactMethods";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { parseReason } from "./parseReason";

export async function warnMember(
  pluginData: GuildPluginData<ModActionsPluginType>,
  reason: string,
  member: GuildMember | null,
  user?: User | null,
  warnOptions: WarnOptions = {},
): Promise<WarnResult> {
  if (!member && !user) {
    return {
      status: "failed",
      error: "No member or user passed",
    };
  }

  user = member?.user ?? user;

  const config = pluginData.config.get();
  reason = parseReason(config, reason);
  let notifyResult: UserNotificationResult;

  if (config.warn_message) {
    const warnMessage = await renderTemplate(
      config.warn_message,
      new TemplateSafeValueContainer({
        guildName: pluginData.guild.name,
        reason,
        moderator: warnOptions.caseArgs?.modId
          ? userToTemplateSafeUser(await resolveUser(pluginData.client, warnOptions.caseArgs.modId))
          : null,
      }),
    );
    const contactMethods = warnOptions?.contactMethods
      ? warnOptions.contactMethods
      : getDefaultContactMethods(pluginData, "warn");
    notifyResult = await notifyUser(user as User, warnMessage, contactMethods);
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
    } else if (!warnOptions.silentErrors) {
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
    userId: user!.id,
    modId,
    type: CaseTypes.Warn,
    reason,
    noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
  });

  const mod = await pluginData.guild.members.fetch(modId as Snowflake);
  pluginData.getPlugin(LogsPlugin).logMemberWarn({
    mod,
    member,
    user,
    caseNumber: createdCase.case_number,
    reason: reason ?? "",
  });

  pluginData.state.events.emit("warn", user!.id, reason, warnOptions.isAutomodAction);

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
