import z from "zod/v4";
import { MINUTES, SECONDS } from "../../utils.js";

export const RECENT_SPAM_EXPIRY_TIME = 10 * SECONDS;
export const RECENT_ACTION_EXPIRY_TIME = 5 * MINUTES;
export const RECENT_NICKNAME_CHANGE_EXPIRY_TIME = 5 * MINUTES;

export const RecentActionType = {
  Message: 1,
  Mention: 2,
  Link: 3,
  Attachment: 4,
  Emoji: 5,
  Line: 6,
  Character: 7,
  VoiceChannelMove: 8,
  MemberJoin: 9,
  Sticker: 10,
  MemberLeave: 11,
  ThreadCreate: 12,
} as const;

export type RecentActionType = typeof RecentActionType[keyof typeof RecentActionType];

export const zNotify = z.union([z.literal("dm"), z.literal("channel")]);
