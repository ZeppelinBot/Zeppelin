import { commandTypeHelpers as ct } from "../../../commandTypes";
import { CaseTypes } from "../../../data/CaseTypes";
import { LogType } from "../../../data/LogType";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { resolveUser, stripObjectToScalars } from "../../../utils";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { modActionsCmd } from "../types";

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

    const userName = `${user.username}#${user.discriminator}`;
    const reason = formatReasonWithAttachments(args.note, msg.attachments.array());

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

    pluginData.state.events.emit("note", user.id, reason);
  },
});
