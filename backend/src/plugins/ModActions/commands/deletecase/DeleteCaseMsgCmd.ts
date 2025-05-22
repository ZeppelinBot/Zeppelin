import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { resolveMessageMember } from "../../../../pluginUtils.js";
import { trimLines } from "../../../../utils.js";
import { modActionsMsgCmd } from "../../types.js";
import { actualDeleteCaseCmd } from "./actualDeleteCaseCmd.js";

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
    const member = await resolveMessageMember(message);
    actualDeleteCaseCmd(pluginData, message, member, args.caseNumber, args.force);
  },
});
