import { MINUTES, SECONDS } from "../../utils";

export const RECENT_SPAM_EXPIRY_TIME = 10 * SECONDS;
export const RECENT_ACTION_EXPIRY_TIME = 5 * MINUTES;
export const RECENT_NICKNAME_CHANGE_EXPIRY_TIME = 5 * MINUTES;

export enum RecentActionType {
  Message = 1,
  Mention,
  Link,
  Attachment,
  Emoji,
  Line,
  Character,
  VoiceChannelMove,
  MemberJoin,
  Sticker,
  MemberLeave,
}
