export enum LogType {
  MEMBER_WARN = 1,
  MEMBER_MUTE,
  MEMBER_UNMUTE,
  MEMBER_MUTE_EXPIRED,
  MEMBER_KICK,
  MEMBER_BAN,
  MEMBER_UNBAN,
  MEMBER_FORCEBAN,
  MEMBER_SOFTBAN,
  MEMBER_JOIN,
  MEMBER_LEAVE,
  MEMBER_ROLE_ADD,
  MEMBER_ROLE_REMOVE,
  MEMBER_NICK_CHANGE,
  MEMBER_USERNAME_CHANGE,
  MEMBER_RESTORE,

  CHANNEL_CREATE,
  CHANNEL_DELETE,

  ROLE_CREATE,
  ROLE_DELETE,

  MESSAGE_EDIT,
  MESSAGE_DELETE,
  MESSAGE_DELETE_BULK,
  MESSAGE_DELETE_BARE,

  VOICE_CHANNEL_JOIN,
  VOICE_CHANNEL_LEAVE,
  VOICE_CHANNEL_MOVE,

  COMMAND,

  MESSAGE_SPAM_DETECTED,
  CENSOR,
  CLEAN,

  CASE_CREATE,

  MASSBAN,

  MEMBER_TIMED_MUTE,
  MEMBER_TIMED_UNMUTE,

  MEMBER_JOIN_WITH_PRIOR_RECORDS,
  OTHER_SPAM_DETECTED,

  MEMBER_ROLE_CHANGES,
  VOICE_CHANNEL_FORCE_MOVE,

  CASE_UPDATE,

  MEMBER_MUTE_REJOIN,

  SCHEDULED_MESSAGE,
  POSTED_SCHEDULED_MESSAGE,

  BOT_ALERT,
  AUTOMOD_ALERT,
  AUTOMOD_ACTION,
}
