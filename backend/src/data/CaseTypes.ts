export const CaseTypes = {
  Ban: 1,
  Unban: 2,
  Note: 3,
  Warn: 4,
  Kick: 5,
  Mute: 6,
  Unmute: 7,
  Deleted: 8,
  Softban: 9,
} as const;

export type CaseTypes = typeof CaseTypes[keyof typeof CaseTypes];

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
