import { Attachment, ChatInputCommandInteraction, GuildMember, Snowflake, TextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { LogType } from "../../../../data/LogType";
import { sendErrorMessage, sendSuccessMessage } from "../../../../pluginUtils";
import { DAYS, MINUTES, UnknownUser } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";
import { ignoreEvent } from "../ignoreEvent";

export async function actualForceBanCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  authorId: string,
  user: User | UnknownUser,
  reason: string,
  attachments: Array<Attachment>,
  mod: GuildMember,
) {
  const formattedReason = formatReasonWithAttachments(reason, attachments);

  ignoreEvent(pluginData, IgnoredEventType.Ban, user.id);
  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_BAN, user.id);

  try {
    // FIXME: Use banUserId()?
    await pluginData.guild.bans.create(user.id as Snowflake, {
      deleteMessageSeconds: (1 * DAYS) / MINUTES,
      reason: formattedReason ?? undefined,
    });
  } catch {
    sendErrorMessage(pluginData, context, "Failed to forceban member");
    return;
  }

  // Create a case
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    userId: user.id,
    modId: mod.id,
    type: CaseTypes.Ban,
    reason: formattedReason,
    ppId: mod.id !== authorId ? authorId : undefined,
  });

  // Confirm the action
  sendSuccessMessage(pluginData, context, `Member forcebanned (Case #${createdCase.case_number})`);

  // Log the action
  pluginData.getPlugin(LogsPlugin).logMemberForceban({
    mod,
    userId: user.id,
    caseNumber: createdCase.case_number,
    reason: formattedReason,
  });

  pluginData.state.events.emit("ban", user.id, formattedReason);
}
