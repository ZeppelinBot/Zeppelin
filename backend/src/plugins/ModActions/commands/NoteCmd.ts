import { modActionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { Case } from "../../../data/entities/Case";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogType } from "../../../data/LogType";
import { CaseTypes } from "../../../data/CaseTypes";
import { resolveUser, stripObjectToScalars } from "../../../utils";

export const NoteCmd = modActionsCmd({
  trigger: "note",
  permission: "can_note",
  description: "Add a note to the specified user",

  signature: {
    user: ct.string(),
    note: ct.string({ catchAll: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    const userName = `${user.username}#${user.discriminator}`;
    const reason = formatReasonWithAttachments(args.note, msg.attachments);

    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const createdCase = await casesPlugin.createCase({
      userId: user.id,
      modId: msg.author.id,
      type: CaseTypes.Note,
      reason,
    });

    pluginData.state.serverLogs.log(LogType.MEMBER_NOTE, {
      mod: stripObjectToScalars(msg.author),
      user: stripObjectToScalars(user, ["user", "roles"]),
      caseNumber: createdCase.case_number,
      reason,
    });

    sendSuccessMessage(pluginData, msg.channel, `Note added on **${userName}** (Case #${createdCase.case_number})`);
  },
});
