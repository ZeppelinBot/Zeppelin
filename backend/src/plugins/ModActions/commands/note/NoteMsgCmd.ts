import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { resolveUser } from "../../../../utils";
import { CommonPlugin } from "../../../Common/CommonPlugin";
import { actualNoteCmd } from "../../functions/actualCommands/actualNoteCmd";
import { modActionsMsgCmd } from "../../types";

export const NoteMsgCmd = modActionsMsgCmd({
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
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, `User not found`);
      return;
    }

    if (!args.note && msg.attachments.size === 0) {
      pluginData.getPlugin(CommonPlugin).sendErrorMessage(msg, "Text or attachment required");
      return;
    }

    actualNoteCmd(pluginData, msg, msg.author, [...msg.attachments.values()], user, args.note || "");
  },
});
