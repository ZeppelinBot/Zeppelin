import { Attachment, ChatInputCommandInteraction, GuildMember, TextBasedChannel } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../../pluginUtils";
import { UserNotificationMethod, renderUserUsername } from "../../../../utils";
import { waitForButtonConfirm } from "../../../../utils/waitForInteraction";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";
import { warnMember } from "../warnMember";

export async function actualWarnCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  authorId: string,
  mod: GuildMember,
  memberToWarn: GuildMember,
  reason: string,
  attachments: Attachment[],
  contactMethods?: UserNotificationMethod[],
) {
  const config = pluginData.config.get();
  const formattedReason = formatReasonWithAttachments(reason, attachments);

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const priorWarnAmount = await casesPlugin.getCaseTypeAmountForUserId(memberToWarn.id, CaseTypes.Warn);
  if (config.warn_notify_enabled && priorWarnAmount >= config.warn_notify_threshold) {
    const reply = await waitForButtonConfirm(
      context,
      { content: config.warn_notify_message.replace("{priorWarnings}", `${priorWarnAmount}`) },
      { confirmText: "Yes", cancelText: "No", restrictToId: authorId },
    );
    if (!reply) {
      sendErrorMessage(pluginData, context, "Warn cancelled by moderator");
      return;
    }
  }

  const warnResult = await warnMember(pluginData, memberToWarn, formattedReason, {
    contactMethods,
    caseArgs: {
      modId: mod.id,
      ppId: mod.id !== authorId ? authorId : undefined,
      reason: formattedReason,
    },
    retryPromptContext: context,
  });

  if (warnResult.status === "failed") {
    sendErrorMessage(pluginData, context, "Failed to warn user");
    return;
  }

  const messageResultText = warnResult.notifyResult.text ? ` (${warnResult.notifyResult.text})` : "";

  sendSuccessMessage(
    pluginData,
    context,
    `Warned **${renderUserUsername(memberToWarn.user)}** (Case #${warnResult.case.case_number})${messageResultText}`,
  );
}
