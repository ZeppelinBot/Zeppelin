import { CaseTypes } from "../../data/CaseTypes";

// These emoji icons are hosted on the Hangar server
// If you'd like your self-hosted instance to use these icons, check #add-your-bot on that server
export const caseIcons: Record<CaseTypes, string> = {
  [CaseTypes.Ban]: "<:case_ban:906897178176393246>",
  [CaseTypes.Unban]: "<:case_unban:906897177824067665>",
  [CaseTypes.Note]: "<:case_note:906897177832476743>",
  [CaseTypes.Warn]: "<:case_warn:906897177840844832>",
  [CaseTypes.Kick]: "<:case_kick:906897178310639646>",
  [CaseTypes.Mute]: "<:case_mute:906897178147057664>",
  [CaseTypes.Unmute]: "<:case_unmute:906897177819881523>",
  [CaseTypes.Deleted]: "<:case_deleted:906897178209968148>",
  [CaseTypes.Softban]: "<:case_softban:906897177828278274>",
};
