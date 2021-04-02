import { modActionsCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { Case } from "../../../data/entities/Case";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { formatReasonWithAttachments } from "../functions/formatReasonWithAttachments";
import { CasesPlugin } from "../../Cases/CasesPlugin";
import { LogType } from "../../../data/LogType";
import { CaseTypes } from "../../../data/CaseTypes";

export const UpdateCmd = modActionsCmd({
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
    let theCase: Case | undefined;
    if (args.caseNumber != null) {
      theCase = await pluginData.state.cases.findByCaseNumber(args.caseNumber);
    } else {
      theCase = await pluginData.state.cases.findLatestByModId(msg.author.id);
    }

    if (!theCase) {
      sendErrorMessage(pluginData, msg.channel, "Case not found");
      return;
    }

    if (!args.note && msg.attachments.length === 0) {
      sendErrorMessage(pluginData, msg.channel, "Text or attachment required");
      return;
    }

    const note = formatReasonWithAttachments(args.note, msg.attachments);

    const casesPlugin = pluginData.getPlugin(CasesPlugin);
    await casesPlugin.createCaseNote({
      caseId: theCase.id,
      modId: msg.author.id,
      body: note,
    });

    pluginData.state.serverLogs.log(LogType.CASE_UPDATE, {
      mod: msg.author,
      caseNumber: theCase.case_number,
      caseType: CaseTypes[theCase.type],
      note,
    });

    sendSuccessMessage(pluginData, msg.channel, `Case \`#${theCase.case_number}\` updated`);
  },
});
