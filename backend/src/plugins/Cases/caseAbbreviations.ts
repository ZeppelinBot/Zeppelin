import { CaseTypes } from "../../data/CaseTypes";

export const caseAbbreviations = {
  [CaseTypes.Ban]: "BAN",
  [CaseTypes.Unban]: "UNBN",
  [CaseTypes.Note]: "NOTE",
  [CaseTypes.Warn]: "WARN",
  [CaseTypes.Kick]: "KICK",
  [CaseTypes.Mute]: "MUTE",
  [CaseTypes.Unmute]: "UNMT",
  [CaseTypes.Deleted]: "DEL",
  [CaseTypes.Softban]: "SFTB",
};
