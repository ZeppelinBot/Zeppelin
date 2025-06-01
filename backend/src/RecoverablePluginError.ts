import { Guild } from "discord.js";

export const ERRORS = {
  NO_MUTE_ROLE_IN_CONFIG: 1,
  UNKNOWN_NOTE_CASE: 2,
  INVALID_EMOJI: 3,
  NO_USER_NOTIFICATION_CHANNEL: 4,
  INVALID_USER_NOTIFICATION_CHANNEL: 5,
  INVALID_USER: 6,
  INVALID_MUTE_ROLE_ID: 7,
  MUTE_ROLE_ABOVE_ZEP: 8,
  USER_ABOVE_ZEP: 9,
  USER_NOT_MODERATABLE: 10,
  TEMPLATE_PARSE_ERROR: 11,
} as const;

export type ERRORS = typeof ERRORS[keyof typeof ERRORS];

export const RECOVERABLE_PLUGIN_ERROR_MESSAGES = {
  [ERRORS.NO_MUTE_ROLE_IN_CONFIG]: "No mute role specified in config",
  [ERRORS.UNKNOWN_NOTE_CASE]: "Tried to add a note to an unknown case",
  [ERRORS.INVALID_EMOJI]: "Invalid emoji",
  [ERRORS.NO_USER_NOTIFICATION_CHANNEL]: "No user notify channel specified",
  [ERRORS.INVALID_USER_NOTIFICATION_CHANNEL]: "Invalid user notify channel specified",
  [ERRORS.INVALID_USER]: "Invalid user",
  [ERRORS.INVALID_MUTE_ROLE_ID]: "Specified mute role is not valid",
  [ERRORS.MUTE_ROLE_ABOVE_ZEP]: "Specified mute role is above Zeppelin in the role hierarchy",
  [ERRORS.USER_ABOVE_ZEP]: "Cannot mute user, specified user is above Zeppelin in the role hierarchy",
  [ERRORS.USER_NOT_MODERATABLE]: "Cannot mute user, specified user is not moderatable",
  [ERRORS.TEMPLATE_PARSE_ERROR]: "Template parse error",
};

export class RecoverablePluginError extends Error {
  public readonly code: ERRORS;
  public readonly guild?: Guild;

  constructor(code: ERRORS, guild?: Guild) {
    super(RECOVERABLE_PLUGIN_ERROR_MESSAGES[code]);
    this.guild = guild;
    this.code = code;
  }
}
