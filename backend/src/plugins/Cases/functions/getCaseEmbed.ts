import { Case } from "../../../data/entities/Case";
import { AdvancedMessageContent, MessageContent } from "eris";
import moment from "moment-timezone";
import { CaseTypes } from "../../../data/CaseTypes";
import { PluginData, helpers } from "knub";
import { CasesPluginType } from "../types";
import { CaseTypeColors } from "../../../data/CaseTypeColors";
import { resolveCaseId } from "./resolveCaseId";
import { chunkLines, chunkMessageLines, emptyEmbedValue, messageLink } from "../../../utils";
import { inGuildTz } from "../../../utils/timezones";
import { getDateFormat } from "../../../utils/dateFormats";

export async function getCaseEmbed(
  pluginData: PluginData<CasesPluginType>,
  caseOrCaseId: Case | number,
): Promise<AdvancedMessageContent> {
  const theCase = await pluginData.state.cases.with("notes").find(resolveCaseId(caseOrCaseId));
  if (!theCase) return null;

  const createdAt = moment.utc(theCase.created_at);
  const actionTypeStr = CaseTypes[theCase.type].toUpperCase();

  let userName = theCase.user_name;
  if (theCase.user_id && theCase.user_id !== "0") userName += `\n<@!${theCase.user_id}>`;

  let modName = theCase.mod_name;
  if (theCase.mod_id) modName += `\n<@!${theCase.mod_id}>`;

  const embed: any = {
    title: `${actionTypeStr} - Case #${theCase.case_number}`,
    footer: {
      text: `Case created on ${inGuildTz(pluginData, createdAt).format(getDateFormat(pluginData, "pretty_datetime"))}`,
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
      const noteDate = moment.utc(note.created_at);
      let noteBody = note.body.trim();
      if (noteBody === "") {
        noteBody = emptyEmbedValue;
      }

      const chunks = chunkMessageLines(noteBody, 1014);

      for (let i = 0; i < chunks.length; i++) {
        if (i === 0) {
          const prettyNoteDate = inGuildTz(pluginData, noteDate).format(getDateFormat(pluginData, "pretty_datetime"));
          embed.fields.push({
            name: `${note.mod_name} at ${prettyNoteDate}:`,
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

  if (theCase.log_message_id) {
    const [channelId, messageId] = theCase.log_message_id.split("-");
    const link = messageLink(pluginData.guild.id, channelId, messageId);
    embed.fields.push({
      name: emptyEmbedValue,
      value: `[Go to original case in case log channel](${link})`,
    });
  }

  return { embed };
}
