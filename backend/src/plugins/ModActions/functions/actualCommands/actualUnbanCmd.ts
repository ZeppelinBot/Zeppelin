import { Attachment, ChatInputCommandInteraction, GuildMember, Snowflake, TextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { LogType } from "../../../../data/LogType";
import { clearExpiringTempban } from "../../../../data/loops/expiringTempbansLoop";
import { sendErrorMessage, sendSuccessMessage } from "../../../../pluginUtils";
import { UnknownUser } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { IgnoredEventType, ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";
import { ignoreEvent } from "../ignoreEvent";

export async function actualUnbanCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  authorId: string,
  user: User | UnknownUser,
  reason: string,
  attachments: Array<Attachment>,
  mod: GuildMember,
) {
  pluginData.state.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, user.id);
  const formattedReason = formatReasonWithAttachments(reason, attachments);

  try {
    ignoreEvent(pluginData, IgnoredEventType.Unban, user.id);
    await pluginData.guild.bans.remove(user.id as Snowflake, formattedReason ?? undefined);
  } catch {
    sendErrorMessage(pluginData, context, "Failed to unban member; are you sure they're banned?");
    return;
  }

  // Create a case
  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    userId: user.id,
    modId: mod.id,
    type: CaseTypes.Unban,
    reason: formattedReason,
    ppId: mod.id !== authorId ? authorId : undefined,
  });

  // Delete the tempban, if one exists
  const tempban = await pluginData.state.tempbans.findExistingTempbanForUserId(user.id);
  if (tempban) {
    clearExpiringTempban(tempban);
    await pluginData.state.tempbans.clear(user.id);
  }

  // Confirm the action
  sendSuccessMessage(pluginData, context, `Member unbanned (Case #${createdCase.case_number})`);

  // Log the action
  pluginData.getPlugin(LogsPlugin).logMemberUnban({
    mod: mod.user,
    userId: user.id,
    caseNumber: createdCase.case_number,
    reason: formattedReason ?? "",
  });

  pluginData.state.events.emit("unban", user.id);
}
