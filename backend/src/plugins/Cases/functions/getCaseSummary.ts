import { PluginData } from "knub";
import { CasesPluginType } from "../types";
import { convertDelayStringToMS, DAYS, disableLinkPreviews, emptyEmbedValue, messageLink } from "../../../utils";
import { DBDateFormat, getDateFormat } from "../../../utils/dateFormats";
import { CaseTypes, CaseTypeToName } from "../../../data/CaseTypes";
import moment from "moment-timezone";
import { Case } from "../../../data/entities/Case";
import { inGuildTz } from "../../../utils/timezones";
import humanizeDuration from "humanize-duration";
import { humanizeDurationShort } from "../../../humanizeDurationShort";
import { caseAbbreviations } from "../caseAbbreviations";
import { getCaseIcon } from "./getCaseIcon";

const CASE_SUMMARY_REASON_MAX_LENGTH = 300;
const INCLUDE_MORE_NOTES_THRESHOLD = 20;
const UPDATE_STR = "**[Update]**";

const RELATIVE_TIME_THRESHOLD = 7 * DAYS;

export async function getCaseSummary(
  pluginData: PluginData<CasesPluginType>,
  caseOrCaseId: Case | number,
  withLinks = false,
) {
  const config = pluginData.config.get();

  const caseId = caseOrCaseId instanceof Case ? caseOrCaseId.id : caseOrCaseId;
  const theCase = await pluginData.state.cases.with("notes").find(caseId);

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
    const nextWhitespaceIndex = match ? CASE_SUMMARY_REASON_MAX_LENGTH + match.index : CASE_SUMMARY_REASON_MAX_LENGTH;
    if (nextWhitespaceIndex < reason.length) {
      reason = reason.slice(0, nextWhitespaceIndex - 1) + "...";
    }
  }

  reason = disableLinkPreviews(reason);

  const timestamp = moment.utc(theCase.created_at, DBDateFormat);
  const relativeTimeCutoff = convertDelayStringToMS(config.relative_time_cutoff);
  const useRelativeTime = config.show_relative_times && Date.now() - timestamp.valueOf() < relativeTimeCutoff;
  const prettyTimestamp = useRelativeTime
    ? moment.utc().to(timestamp)
    : inGuildTz(pluginData, timestamp).format(getDateFormat(pluginData, "date"));

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
