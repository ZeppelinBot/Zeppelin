import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { CaseTypes } from "../../../data/CaseTypes.js";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils.js";
import { renderUsername, resolveUser } from "../../../utils.js";
import { CasesPlugin } from "../../Cases/CasesPlugin.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments.js";
import { modActionsCmd } from "../types.js";

export const NoteCmd = modActionsCmd({
  trigger: "note",
  permission: "can_note",
  description: "Add a note to the specified user",

  signature: {
    user: ct.string(),
    note: ct.string({ required: false, catchAll: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user);
    if (!user.id) {
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    if (!args.note && msg.attachments.size === 0) {
      sendErrorMessage(pluginData, msg.channel, "Text or attachment required");
      return;
    }

    const userName = renderUsername(user);
    const reason = formatReasonWithAttachments(args.note, [...msg.attachments.values()]);

    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    const createdCase = await casesPlugin.createCase({
      userId: user.id,
      modId: msg.author.id,
      type: CaseTypes.Note,
      reason,
    });

    pluginData.getPlugin(LogsPlugin).logMemberNote({
      mod: msg.author,
      user,
      caseNumber: createdCase.case_number,
      reason,
    });

    sendSuccessMessage(pluginData, msg.channel, `Note added on **${userName}** (Case #${createdCase.case_number})`);

    pluginData.state.events.emit("note", user.id, reason);
  },
});
