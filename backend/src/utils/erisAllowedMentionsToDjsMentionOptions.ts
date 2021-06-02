import { MessageMentionOptions, MessageMentionTypes } from "discord.js";

export function erisAllowedMentionsToDjsMentionOptions(
  allowedMentions: ErisAllowedMentionFormat | undefined,
): MessageMentionOptions | undefined {
  if (allowedMentions === undefined) return undefined;

  const parse: MessageMentionTypes[] = [];
  let users: string[] | undefined;
  let roles: string[] | undefined;

  if (Array.isArray(allowedMentions.users)) {
    users = allowedMentions.users;
  } else if (allowedMentions.users === true) {
    parse.push("users");
  }

  if (Array.isArray(allowedMentions.roles)) {
    roles = allowedMentions.roles;
  } else if (allowedMentions.roles === true) {
    parse.push("roles");
  }

  if (allowedMentions.everyone === true) {
    parse.push("everyone");
  }

  const mentions: MessageMentionOptions = {
    parse,
    users,
    roles,
    repliedUser: allowedMentions.repliedUser,
  };

  return mentions;
}

export interface ErisAllowedMentionFormat {
  everyone?: boolean | undefined;
  users?: boolean | string[] | undefined;
  roles?: boolean | string[] | undefined;
  repliedUser?: boolean | undefined;
}
