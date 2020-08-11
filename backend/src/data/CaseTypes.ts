export enum CaseTypes {
  Ban = 1,
  Unban,
  Note,
  Warn,
  Kick,
  Mute,
  Unmute,
  Deleted,
  Softban,
}

export const CaseNameToType = {
  ban: CaseTypes.Ban,
  unban: CaseTypes.Unban,
  note: CaseTypes.Note,
  warn: CaseTypes.Warn,
  kick: CaseTypes.Kick,
  mute: CaseTypes.Mute,
  unmute: CaseTypes.Unmute,
  deleted: CaseTypes.Deleted,
  softban: CaseTypes.Softban,
};

export const CaseTypeToName = Object.entries(CaseNameToType).reduce((map, [name, type]) => {
  map[type] = name;
  return map;
}, {}) as Record<CaseTypes, string>;
