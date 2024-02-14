import { Attachment, ChatInputCommandInteraction, GuildMember, TextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { Case } from "../../../../data/entities/Case";
import { canActOn, sendErrorMessage, sendSuccessMessage } from "../../../../pluginUtils";
import { UnknownUser, renderUserUsername, resolveMember } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";

export async function actualAddCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  author: GuildMember,
  mod: GuildMember,
  attachments: Array<Attachment>,
  user: User | UnknownUser,
  type: keyof CaseTypes,
  reason: string,
) {
  // If the user exists as a guild member, make sure we can act on them first
  const member = await resolveMember(pluginData.client, pluginData.guild, user.id);
  if (member && !canActOn(pluginData, author, member)) {
    sendErrorMessage(pluginData, context, "Cannot add case on this user: insufficient permissions");
    return;
  }

  const formattedReason = formatReasonWithAttachments(reason, attachments);

  // Create the case
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const theCase: Case = await casesPlugin.createCase({
    userId: user.id,
    modId: mod.id,
    type: CaseTypes[type],
    reason: formattedReason,
    ppId: mod.id !== author.id ? author.id : undefined,
  });

  if (user) {
    sendSuccessMessage(pluginData, context, `Case #${theCase.case_number} created for **${renderUserUsername(user)}**`);
  } else {
    sendSuccessMessage(pluginData, context, `Case #${theCase.case_number} created`);
  }

  // Log the action
  pluginData.getPlugin(LogsPlugin).logCaseCreate({
    mod: mod.user,
    userId: user.id,
    caseNum: theCase.case_number,
    caseType: type.toUpperCase(),
    reason: formattedReason,
  });
}
