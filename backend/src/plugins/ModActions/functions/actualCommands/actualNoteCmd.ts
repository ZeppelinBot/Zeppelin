import { Attachment, ChatInputCommandInteraction, TextBasedChannel, User } from "discord.js";
import { GuildPluginData } from "knub";
import { CaseTypes } from "../../../../data/CaseTypes";
import { sendSuccessMessage } from "../../../../pluginUtils";
import { UnknownUser, renderUserUsername } from "../../../../utils";
import { CasesPlugin } from "../../../Cases/CasesPlugin";
import { LogsPlugin } from "../../../Logs/LogsPlugin";
import { ModActionsPluginType } from "../../types";
import { formatReasonWithAttachments } from "../formatReasonWithAttachments";

export async function actualNoteCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: TextBasedChannel | ChatInputCommandInteraction,
  author: User,
  attachments: Array<Attachment>,
  user: User | UnknownUser,
  note: string,
) {
  const userName = renderUserUsername(user);
  const reason = formatReasonWithAttachments(note, attachments);

  const casesPlugin = pluginData.getPlugin(CasesPlugin);
  const createdCase = await casesPlugin.createCase({
    userId: user.id,
    modId: author.id,
    type: CaseTypes.Note,
    reason,
  });

  pluginData.getPlugin(LogsPlugin).logMemberNote({
    mod: author,
    user,
    caseNumber: createdCase.case_number,
    reason,
  });

  sendSuccessMessage(
    pluginData,
    context,
    `Note added on **${userName}** (Case #${createdCase.case_number})`,
    undefined,
    undefined,
    true,
  );

  pluginData.state.events.emit("note", user.id, reason);
}
