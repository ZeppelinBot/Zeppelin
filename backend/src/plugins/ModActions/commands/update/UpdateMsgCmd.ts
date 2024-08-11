import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { updateCase } from "../../functions/updateCase.js";
import { modActionsMsgCmd } from "../../types.js";

export const UpdateMsgCmd = modActionsMsgCmd({
  trigger: ["update", "reason"],
  permission: "can_note",
  description:
    "Update the specified case (or, if case number is omitted, your latest case) by adding more notes/details to it",

  signature: [
    {
      caseNumber: ct.number(),
      note: ct.string({ required: false, catchAll: true }),
    },
    {
      note: ct.string({ required: false, catchAll: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    await updateCase(pluginData, msg, msg.author, args.caseNumber, args.note, [...msg.attachments.values()]);
  },
});
