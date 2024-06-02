import { GuildMember, Snowflake } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { TemplateParseError, TemplateSafeValueContainer, renderTemplate } from "../../../templateFormatter.js";
import {
  UserNotificationResult,
  createUserNotificationError,
  notifyUser,
  resolveUser,
  ucfirst,
} from "../../../utils.js";
import { userToTemplateSafeUser } from "../../../utils/templateSafeObjects.js";
import { waitForButtonConfirm } from "../../../utils/waitForInteraction.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { ModActionsPluginType, WarnOptions, WarnResult } from "../types.js";
import { getDefaultContactMethods } from "./getDefaultContactMethods.js";

export async function warnMember(
  pluginData: GuildPluginData<ModActionsPluginType>,
  member: GuildMember,
  reason: string,
  warnOptions: WarnOptions = {},
): Promise<WarnResult> {
  const config = pluginData.config.get();

  let notifyResult: UserNotificationResult;
  if (config.warn_message) {
    let warnMessage: string;
    try {
      warnMessage = await renderTemplate(
        config.warn_message,
        new TemplateSafeValueContainer({
          guildName: pluginData.guild.name,
          reason,
          moderator: warnOptions.caseArgs?.modId
            ? userToTemplateSafeUser(await resolveUser(pluginData.client, warnOptions.caseArgs.modId))
            : null,
        }),
      );
    } catch (err) {
      if (err instanceof TemplateParseError) {
        return {
          status: "failed",
          error: `Invalid warn_message format: ${err.message}`,
        };
      }
      throw err;
    }
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
  pluginData.getPlugin(LogsPlugin).logMemberWarn({
    mod,
    member,
    caseNumber: createdCase.case_number,
    reason: reason ?? "",
  });

  pluginData.state.events.emit("warn", member.id, reason, warnOptions.isAutomodAction);

  return {
    status: "success",
    case: createdCase,
    notifyResult,
  };
}
