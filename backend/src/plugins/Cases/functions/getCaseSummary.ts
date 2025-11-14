import { GuildPluginData } from "vety";
import { splitMessageIntoChunks } from "vety/helpers";
import moment from "moment-timezone";
import { Case } from "../../../data/entities/Case.js";
import { convertDelayStringToMS, DBDateFormat, messageLink } from "../../../utils.js";
import { TimeAndDatePlugin } from "../../TimeAndDate/TimeAndDatePlugin.js";
import { caseAbbreviations } from "../caseAbbreviations.js";
import { CasesPluginType } from "../types.js";
import { getCaseIcon } from "./getCaseIcon.js";

const CASE_SUMMARY_REASON_MAX_LENGTH = 300;
const INCLUDE_MORE_NOTES_THRESHOLD = 20;
const UPDATE_STR = "**[Update]**";

export async function getCaseSummary(
  pluginData: GuildPluginData<CasesPluginType>,
  caseOrCaseId: Case | number,
  withLinks = false,
  requestMemberId?: string,
): Promise<string | null> {
  const config = pluginData.config.get();
  const timeAndDate = pluginData.getPlugin(TimeAndDatePlugin);

  const caseId = caseOrCaseId instanceof Case ? caseOrCaseId.id : caseOrCaseId;
  const theCase = await pluginData.state.cases.with("notes").find(caseId);
  if (!theCase) return null;

  const firstNote = theCase.notes[0];
  let reason = firstNote ? firstNote.body : "";
  let leftoverNotes = Math.max(0, theCase.notes.length - 1);

  for (let i = 1; i < theCase.notes.length; i++) {
    if (reason.length >= CASE_SUMMARY_REASON_MAX_LENGTH - UPDATE_STR.length - INCLUDE_MORE_NOTES_THRESHOLD) break;
    reason += ` ${UPDATE_STR} ${theCase.notes[i].body}`;
    leftoverNotes--;
  }

  if (reason.length > CASE_SUMMARY_REASON_MAX_LENGTH) {
    const match = reason.slice(CASE_SUMMARY_REASON_MAX_LENGTH, 100).match(/(?:[.,!?\s]|$)/);
    const nextWhitespaceIndex = match ? CASE_SUMMARY_REASON_MAX_LENGTH + match.index! : CASE_SUMMARY_REASON_MAX_LENGTH;
    const reasonChunks = splitMessageIntoChunks(reason, nextWhitespaceIndex);
    reason = reasonChunks[0] + "...";
  }

  const timestamp = moment.utc(theCase.created_at, DBDateFormat);
  const relativeTimeCutoff = convertDelayStringToMS(config.relative_time_cutoff)!;
  const useRelativeTime = config.show_relative_times && Date.now() - timestamp.valueOf() < relativeTimeCutoff;
  const timestampWithTz = requestMemberId
    ? await timeAndDate.inMemberTz(requestMemberId, timestamp)
    : timeAndDate.inGuildTz(timestamp);
  const prettyTimestamp = useRelativeTime
    ? moment.utc().to(timestamp)
    : timestampWithTz.format(timeAndDate.getDateFormat("date"));

  const icon = getCaseIcon(pluginData, theCase.type);

  let caseTitle = `\`#${theCase.case_number}\``;
  if (withLinks && theCase.log_message_id) {
    const [channelId, messageId] = theCase.log_message_id.split("-");
    caseTitle = `[${caseTitle}](${messageLink(pluginData.guild.id, channelId, messageId)})`;
  } else {
    caseTitle = `\`${caseTitle}\``;
  }

  let caseType = (caseAbbreviations[theCase.type] || String(theCase.type)).toUpperCase();
  caseType = (caseType + "    ").slice(0, 4);

  let line = `${icon} **\`${caseType}\`** \`[${prettyTimestamp}]\` ${caseTitle} ${reason}`;
  if (leftoverNotes > 1) {
    line += ` *(+${leftoverNotes} ${leftoverNotes === 1 ? "note" : "notes"})*`;
  }

  if (theCase.is_hidden) {
    line += " *(hidden)*";
  }

  return line.trim();
}
