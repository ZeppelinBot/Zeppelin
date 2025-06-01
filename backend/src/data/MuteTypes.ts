export const MuteTypes = {
  Role: 1,
  Timeout: 2,
} as const;

export type MuteTypes = typeof MuteTypes[keyof typeof MuteTypes];
