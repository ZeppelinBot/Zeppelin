import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { resolveUser } from "../../../../utils.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualNoteCmd } from "./actualNoteCmd.js";

export const NoteMsgCmd = modActionsMsgCmd({
  trigger: "note",
  permission: "can_note",
  description: "Add a note to the specified user",

  signature: {
    user: ct.string(),
    note: ct.string({ required: false, catchAll: true }),
  },

  async run({ pluginData, message: msg, args }) {
    const user = await resolveUser(pluginData.client, args.user, "ModActions:NoteMsgCmd");
    if (!user.id) {
      pluginData.state.common.sendErrorMessage(msg, `User not found`);
      return;
    }

    if (!args.note && msg.attachments.size === 0) {
      pluginData.state.common.sendErrorMessage(msg, "Text or attachment required");
      return;
    }

    actualNoteCmd(pluginData, msg, msg.author, [...msg.attachments.values()], user, args.note || "");
  },
});
