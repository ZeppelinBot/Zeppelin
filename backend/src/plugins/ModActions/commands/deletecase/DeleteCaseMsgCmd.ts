import { commandTypeHelpers as ct } from "../../../../commandTypes";
import { trimLines } from "../../../../utils";
import { actualDeleteCaseCmd } from "./actualDeleteCaseCmd";
import { modActionsMsgCmd } from "../../types";

export const DeleteCaseMsgCmd = modActionsMsgCmd({
  trigger: ["delete_case", "deletecase"],
  permission: "can_deletecase",
  description: trimLines(`
    Delete the specified case. This operation can *not* be reversed.
    It is generally recommended to use \`!hidecase\` instead when possible.
  `),

  signature: {
    caseNumber: ct.number({ rest: true }),

    force: ct.switchOption({ def: false, shortcut: "f" }),
  },

  async run({ pluginData, message, args }) {
    actualDeleteCaseCmd(pluginData, message, message.member, args.caseNumber, args.force);
  },
});
