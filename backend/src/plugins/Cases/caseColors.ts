import { CaseTypes } from "../../data/CaseTypes";

export const caseColors: Record<CaseTypes, number> = {
  [CaseTypes.Ban]: 0xcb4314,
  [CaseTypes.Unban]: 0x9b59b6,
  [CaseTypes.Note]: 0x3498db,
  [CaseTypes.Warn]: 0xdae622,
  [CaseTypes.Mute]: 0xe6b122,
  [CaseTypes.Unmute]: 0xa175b3,
  [CaseTypes.Kick]: 0xe67e22,
  [CaseTypes.Deleted]: 0x000000,
  [CaseTypes.Softban]: 0xe67e22,
};
