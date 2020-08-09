import { Case } from "../../../data/entities/Case";
import { AdvancedMessageContent, MessageContent } from "eris";
import moment from "moment-timezone";
import { CaseTypes } from "../../../data/CaseTypes";
import { PluginData, helpers } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypeColors } from "../../../data/CaseTypeColors";
import { resolveCaseId } from "./resolveCaseId";
import { chunkLines, chunkMessageLines, emptyEmbedValue } from "../../../utils";

export async function getCaseEmbed(
  pluginData: PluginData<CasesPluginType>,
  caseOrCaseId: Case | number,
): Promise<AdvancedMessageContent> {
  const theCase = await pluginData.state.cases.with("notes").find(resolveCaseId(caseOrCaseId));
  if (!theCase) return null;

  const createdAt = moment(theCase.created_at);
  const actionTypeStr = CaseTypes[theCase.type].toUpperCase();

  let userName = theCase.user_name;
  if (theCase.user_id && theCase.user_id !== "0") userName += `\n<@!${theCase.user_id}>`;

  let modName = theCase.mod_name;
  if (theCase.mod_id) modName += `\n<@!${theCase.mod_id}>`;

  const embed: any = {
    title: `${actionTypeStr} - Case #${theCase.case_number}`,
    footer: {
      text: `Case created at ${createdAt.format("YYYY-MM-DD [at] HH:mm")}`,
    },
    fields: [
      {
        name: "User",
        value: userName,
        inline: true,
      },
      {
        name: "Moderator",
        value: modName,
        inline: true,
      },
    ],
  };

  if (theCase.pp_id) {
    embed.fields[1].value += `\np.p. ${theCase.pp_name}\n<@!${theCase.pp_id}>`;
  }

  if (theCase.is_hidden) {
    embed.title += " (hidden)";
  }

  if (CaseTypeColors[theCase.type]) {
    embed.color = CaseTypeColors[theCase.type];
  }

  if (theCase.notes.length) {
    theCase.notes.forEach((note: any) => {
      const noteDate = moment(note.created_at);
      let noteBody = note.body.trim();
      if (noteBody === "") {
        noteBody = emptyEmbedValue;
      }

      const chunks = chunkMessageLines(noteBody, 1014);

      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          embed.fields.push({
            name: `${note.mod_name} at ${noteDate.format("YYYY-MM-DD [at] HH:mm")}:`,
            value: chunks[i],
          });
        } else {
          embed.fields.push({
            name: emptyEmbedValue,
            value: chunks[i],
          });
        }
      }
    });
  } else {
    embed.fields.push({
      name: "!!! THIS CASE HAS NO NOTES !!!",
      value: "\u200B",
    });
  }

  return { embed };
}
