import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { sendErrorMessage } from "../../../../pluginUtils";
import { resolveUser } from "../../../../utils";
import { actualNoteCmd } from "../../functions/actualNoteCmd";
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
      sendErrorMessage(pluginData, msg.channel, `User not found`);
      return;
    }

    if (!args.note && msg.attachments.size === 0) {
      sendErrorMessage(pluginData, msg.channel, "Text or attachment required");
      return;
    }

    actualNoteCmd(pluginData, msg.channel, msg.author, [...msg.attachments.values()], user, args.note || "");
  },
});
