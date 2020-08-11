import { CaseTypes } from "../../data/CaseTypes";

export const caseIcons: Record<CaseTypes, string> = {
  [CaseTypes.Ban]: "<:case_ban:742540201443721317>",
  [CaseTypes.Unban]: "<:case_unban:742540201670475846>",
  [CaseTypes.Note]: "<:case_note:742540201368485950>",
  [CaseTypes.Warn]: "<:case_warn:742540201624338454>",
  [CaseTypes.Kick]: "<:case_kick:742540201661825165>",
  [CaseTypes.Mute]: "<:case_mute:742540201817145364>",
  [CaseTypes.Unmute]: "<:case_unmute:742540201489858643>",
  [CaseTypes.Deleted]: "<:case_deleted:742540201473343529>",
  [CaseTypes.Softban]: "<:case_softban:742540201766813747>",
};
