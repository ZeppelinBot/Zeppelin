import * as t from "io-ts";
import { TSafeRegex } from "../../validatorUtils";
import { tDelayString, tNullable } from "../../utils";

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
}

export interface BaseRecentAction {
  identifier: string;
  timestamp: number;
  count: number;
  actioned?: boolean;
}

export type TextRecentAction = BaseRecentAction & {
  type:
    | RecentActionType.Message
    | RecentActionType.Mention
    | RecentActionType.Link
    | RecentActionType.Attachment
    | RecentActionType.Emoji
    | RecentActionType.Line
    | RecentActionType.Character;
  messageInfo: MessageInfo;
};

export type OtherRecentAction = BaseRecentAction & {
  type: RecentActionType.VoiceChannelMove | RecentActionType.MemberJoin;
  userId: string;
};

export type RecentAction = (TextRecentAction | OtherRecentAction) & { expiresAt: number };

export interface RecentSpam {
  archiveId: string;
  actionedUsers: Set<string>;
  expiresAt: number;
}

export type MessageInfo = { channelId: string; messageId: string; userId: string };

export type TextTriggerWithMultipleMatchTypes = {
  match_messages: boolean;
  match_embeds: boolean;
  match_visible_names: boolean;
  match_usernames: boolean;
  match_nicknames: boolean;
  match_custom_status: boolean;
};

export interface TriggerMatchResult {
  trigger: string;
  type: string;
}

export interface MessageTextTriggerMatchResult<T = any> extends TriggerMatchResult {
  type: "message" | "embed";
  str: string;
  userId: string;
  messageInfo: MessageInfo;
  matchedValue: T;
}

export interface OtherTextTriggerMatchResult<T = any> extends TriggerMatchResult {
  type: "username" | "nickname" | "visiblename" | "customstatus";
  str: string;
  userId: string;
  matchedValue: T;
}

export type TextTriggerMatchResult<T = any> = MessageTextTriggerMatchResult<T> | OtherTextTriggerMatchResult<T>;

export interface TextSpamTriggerMatchResult extends TriggerMatchResult {
  type: "textspam";
  actionType: RecentActionType;
  recentActions: TextRecentAction[];

  // Rule that specified the criteria used for matching the spam
  rule: TRule;

  // The identifier used to match the recentActions above.
  // If not null, this should match the identifier of each of the recentActions above.
  identifier: string;
}

export interface OtherSpamTriggerMatchResult extends TriggerMatchResult {
  type: "otherspam";
  actionType: RecentActionType;
  recentActions: OtherRecentAction[];

  // Rule that specified the criteria used for matching the spam
  rule: TRule;

  // The identifier used to match the recentActions above.
  // If not null, this should match the identifier of each of the recentActions above.
  identifier: string;
}

export interface OtherTriggerMatchResult extends TriggerMatchResult {
  type: "other";
  userId: string;
}

export type AnyTriggerMatchResult =
  | TextTriggerMatchResult
  | OtherTriggerMatchResult
  | TextSpamTriggerMatchResult
  | OtherSpamTriggerMatchResult;

export type AnySpamTriggerMatchResult = TextSpamTriggerMatchResult | OtherSpamTriggerMatchResult;

/**
 * TRIGGERS
 */

export const MatchWordsTrigger = t.type({
  words: t.array(t.string),
  case_sensitive: t.boolean,
  only_full_words: t.boolean,
  normalize: t.boolean,
  loose_matching: t.boolean,
  loose_matching_threshold: t.number,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_visible_names: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
  match_custom_status: t.boolean,
});
export type TMatchWordsTrigger = t.TypeOf<typeof MatchWordsTrigger>;

export const MatchRegexTrigger = t.type({
  patterns: t.array(TSafeRegex),
  case_sensitive: t.boolean,
  normalize: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_visible_names: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
  match_custom_status: t.boolean,
});
export type TMatchRegexTrigger = t.TypeOf<typeof MatchRegexTrigger>;

export const MatchInvitesTrigger = t.type({
  include_guilds: tNullable(t.array(t.string)),
  exclude_guilds: tNullable(t.array(t.string)),
  include_invite_codes: tNullable(t.array(t.string)),
  exclude_invite_codes: tNullable(t.array(t.string)),
  allow_group_dm_invites: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_visible_names: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
  match_custom_status: t.boolean,
});
export type TMatchInvitesTrigger = t.TypeOf<typeof MatchInvitesTrigger>;

export const MatchLinksTrigger = t.type({
  include_domains: tNullable(t.array(t.string)),
  exclude_domains: tNullable(t.array(t.string)),
  include_subdomains: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_visible_names: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
  match_custom_status: t.boolean,
});
export type TMatchLinksTrigger = t.TypeOf<typeof MatchLinksTrigger>;

export const MatchAttachmentTypeTrigger = t.type({
  filetype_blacklist: t.array(t.string),
  blacklist_enabled: t.boolean,
  filetype_whitelist: t.array(t.string),
  whitelist_enabled: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_visible_names: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
  match_custom_status: t.boolean,
});
export type TMatchAttachmentTypeTrigger = t.TypeOf<typeof MatchAttachmentTypeTrigger>;

export const BaseSpamTrigger = t.type({
  amount: t.number,
  within: t.string,
});
export type TBaseSpamTrigger = t.TypeOf<typeof BaseSpamTrigger>;

export const BaseTextSpamTrigger = t.intersection([
  BaseSpamTrigger,
  t.type({
    per_channel: t.boolean,
  }),
]);
export type TBaseTextSpamTrigger = t.TypeOf<typeof BaseTextSpamTrigger>;

export const MessageSpamTrigger = BaseTextSpamTrigger;
export type TMessageSpamTrigger = t.TypeOf<typeof MessageSpamTrigger>;
export const MentionSpamTrigger = BaseTextSpamTrigger;
export type TMentionSpamTrigger = t.TypeOf<typeof MentionSpamTrigger>;
export const LinkSpamTrigger = BaseTextSpamTrigger;
export type TLinkSpamTrigger = t.TypeOf<typeof LinkSpamTrigger>;
export const AttachmentSpamTrigger = BaseTextSpamTrigger;
export type TAttachmentSpamTrigger = t.TypeOf<typeof AttachmentSpamTrigger>;
export const EmojiSpamTrigger = BaseTextSpamTrigger;
export type TEmojiSpamTrigger = t.TypeOf<typeof EmojiSpamTrigger>;
export const LineSpamTrigger = BaseTextSpamTrigger;
export type TLineSpamTrigger = t.TypeOf<typeof LineSpamTrigger>;
export const CharacterSpamTrigger = BaseTextSpamTrigger;
export type TCharacterSpamTrigger = t.TypeOf<typeof CharacterSpamTrigger>;
export const VoiceMoveSpamTrigger = BaseSpamTrigger;
export type TVoiceMoveSpamTrigger = t.TypeOf<typeof VoiceMoveSpamTrigger>;

export const MemberJoinTrigger = t.type({
  only_new: t.boolean,
  new_threshold: tDelayString,
});
export type TMemberJoinTrigger = t.TypeOf<typeof MemberJoinTrigger>;

export const MemberJoinSpamTrigger = BaseSpamTrigger;
export type TMemberJoinSpamTrigger = t.TypeOf<typeof MemberJoinTrigger>;

/**
 * ACTIONS
 */

export const CleanAction = t.boolean;

export const WarnAction = t.type({
  reason: tNullable(t.string),
  notify: tNullable(t.string),
  notifyChannel: tNullable(t.string),
});

export const MuteAction = t.type({
  reason: tNullable(t.string),
  duration: tNullable(tDelayString),
  notify: tNullable(t.string),
  notifyChannel: tNullable(t.string),
});

export const KickAction = t.type({
  reason: tNullable(t.string),
  notify: tNullable(t.string),
  notifyChannel: tNullable(t.string),
});

export const BanAction = t.type({
  reason: tNullable(t.string),
  notify: tNullable(t.string),
  notifyChannel: tNullable(t.string),
  deleteMessageDays: tNullable(t.number),
});

export const AlertAction = t.type({
  channel: t.string,
  text: t.string,
});

export const ChangeNicknameAction = t.type({
  name: t.string,
});

export const LogAction = t.boolean;

export const AddRolesAction = t.array(t.string);
export const RemoveRolesAction = t.array(t.string);

export const SetAntiraidLevelAction = t.string;

export const ReplyAction = t.string;

/**
 * RULES
 */

export const Rule = t.type({
  enabled: t.boolean,
  name: t.string,
  presets: tNullable(t.array(t.string)),
  triggers: t.array(
    t.type({
      match_words: tNullable(MatchWordsTrigger),
      match_regex: tNullable(MatchRegexTrigger),
      match_invites: tNullable(MatchInvitesTrigger),
      match_links: tNullable(MatchLinksTrigger),
      match_attachment_type: tNullable(MatchAttachmentTypeTrigger),
      message_spam: tNullable(MessageSpamTrigger),
      mention_spam: tNullable(MentionSpamTrigger),
      link_spam: tNullable(LinkSpamTrigger),
      attachment_spam: tNullable(AttachmentSpamTrigger),
      emoji_spam: tNullable(EmojiSpamTrigger),
      line_spam: tNullable(LineSpamTrigger),
      character_spam: tNullable(CharacterSpamTrigger),
      member_join: tNullable(MemberJoinTrigger),
      member_join_spam: tNullable(MemberJoinSpamTrigger),
      // voice_move_spam: tNullable(VoiceMoveSpamTrigger), // TODO
      // TODO: Duplicates trigger
    }),
  ),
  actions: t.type({
    clean: tNullable(CleanAction),
    warn: tNullable(WarnAction),
    mute: tNullable(MuteAction),
    kick: tNullable(KickAction),
    ban: tNullable(BanAction),
    alert: tNullable(AlertAction),
    change_nickname: tNullable(ChangeNicknameAction),
    log: tNullable(LogAction),
    add_roles: tNullable(AddRolesAction),
    remove_roles: tNullable(RemoveRolesAction),
    set_antiraid_level: tNullable(SetAntiraidLevelAction),
    reply: tNullable(ReplyAction),
  }),
  cooldown: tNullable(t.string),
});
export type TRule = t.TypeOf<typeof Rule>;
