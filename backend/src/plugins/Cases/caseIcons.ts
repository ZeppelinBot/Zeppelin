import { CaseTypes } from "../../data/CaseTypes.js";

// These emoji icons are hosted on the Hangar server
// If you'd like your self-hosted instance to use these icons, check #add-your-bot on that server
export const caseIcons: Record<CaseTypes, string> = {
  [CaseTypes.Ban]: "<:case_ban:1150055546922213436>",
  [CaseTypes.Unban]: "<:case_unban:1150055555335995412>",
  [CaseTypes.Note]: "<:case_note:1150055552412553276>",
  [CaseTypes.Warn]: "<:case_warn:1150055557919686776>",
  [CaseTypes.Kick]: "<:case_kick:1150055557919686776>",
  [CaseTypes.Mute]: "<:case_mute:1150055557919686776>",
  [CaseTypes.Unmute]: "<:case_unmute:1150055557919686776>",
  [CaseTypes.Deleted]: "<:case_deleted:1150055557919686776>",
  [CaseTypes.Softban]: "<:case_softban:1150055557919686776>",
};
