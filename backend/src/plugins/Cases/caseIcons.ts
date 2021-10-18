import { CaseTypes } from "../../data/CaseTypes";

export const caseIcons: Record<CaseTypes, string> = {
  [CaseTypes.Ban]: process.env.EMOJI_BAN || "<:case_ban:742540201443721317>",
  [CaseTypes.Unban]: process.env.EMOJI_UNBAN || "<:case_unban:742540201670475846>",
  [CaseTypes.Note]: process.env.EMOJI_NOTE || "<:case_note:742540201368485950>",
  [CaseTypes.Warn]: process.env.EMOJI_WARN || "<:case_warn:742540201624338454>",
  [CaseTypes.Kick]: process.env.EMOJI_KICK || "<:case_kick:742540201661825165>",
  [CaseTypes.Mute]: process.env.EMOJI_MUTE || "<:case_mute:742540201817145364>",
  [CaseTypes.Unmute]: process.env.EMOJI_UNMUTE || "<:case_unmute:742540201489858643>",
  [CaseTypes.Deleted]: process.env.EMOJI_CASE_DELETED || "<:case_deleted:742540201473343529>",
  [CaseTypes.Softban]: process.env.EMOJI_SOFTBAN || "<:case_softban:742540201766813747>",
};
