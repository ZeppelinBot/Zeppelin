import * as t from "io-ts";
import { AutomodTriggerBlueprint } from "../helpers";
import { AntiraidLevelTrigger } from "./antiraidLevel";
import { AnyMessageTrigger } from "./anyMessage";
import { AttachmentSpamTrigger } from "./attachmentSpam";
import { BanTrigger } from "./ban";
import { CharacterSpamTrigger } from "./characterSpam";
import { CounterTrigger } from "./counterTrigger";
import { EmojiSpamTrigger } from "./emojiSpam";
import { KickTrigger } from "./kick";
import { LineSpamTrigger } from "./lineSpam";
import { LinkSpamTrigger } from "./linkSpam";
import { MatchAttachmentTypeTrigger } from "./matchAttachmentType";
import { MatchInvitesTrigger } from "./matchInvites";
import { MatchLinksTrigger } from "./matchLinks";
import { MatchRegexTrigger } from "./matchRegex";
import { MatchWordsTrigger } from "./matchWords";
import { MemberJoinTrigger } from "./memberJoin";
import { MemberJoinSpamTrigger } from "./memberJoinSpam";
import { MemberLeaveTrigger } from "./memberLeave";
import { MentionSpamTrigger } from "./mentionSpam";
import { MessageSpamTrigger } from "./messageSpam";
import { MuteTrigger } from "./mute";
import { NoteTrigger } from "./note";
import { RoleAddedTrigger } from "./roleAdded";
import { RoleRemovedTrigger } from "./roleRemoved";
import { StickerSpamTrigger } from "./stickerSpam";
import { UnbanTrigger } from "./unban";
import { UnmuteTrigger } from "./unmute";
import { WarnTrigger } from "./warn";

export const availableTriggers: Record<string, AutomodTriggerBlueprint<any, any>> = {
  any_message: AnyMessageTrigger,

  match_words: MatchWordsTrigger,
  match_regex: MatchRegexTrigger,
  match_invites: MatchInvitesTrigger,
  match_links: MatchLinksTrigger,
  match_attachment_type: MatchAttachmentTypeTrigger,
  member_join: MemberJoinTrigger,
  role_added: RoleAddedTrigger,
  role_removed: RoleRemovedTrigger,

  message_spam: MessageSpamTrigger,
  mention_spam: MentionSpamTrigger,
  link_spam: LinkSpamTrigger,
  attachment_spam: AttachmentSpamTrigger,
  emoji_spam: EmojiSpamTrigger,
  line_spam: LineSpamTrigger,
  character_spam: CharacterSpamTrigger,
  member_join_spam: MemberJoinSpamTrigger,
  sticker_spam: StickerSpamTrigger,

  counter_trigger: CounterTrigger,

  note: NoteTrigger,
  warn: WarnTrigger,
  mute: MuteTrigger,
  unmute: UnmuteTrigger,
  kick: KickTrigger,
  ban: BanTrigger,
  unban: UnbanTrigger,

  antiraid_level: AntiraidLevelTrigger,
};

export const AvailableTriggers = t.type({
  any_message: AnyMessageTrigger.configType,

  match_words: MatchWordsTrigger.configType,
  match_regex: MatchRegexTrigger.configType,
  match_invites: MatchInvitesTrigger.configType,
  match_links: MatchLinksTrigger.configType,
  match_attachment_type: MatchAttachmentTypeTrigger.configType,
  member_join: MemberJoinTrigger.configType,
  member_leave: MemberLeaveTrigger.configType,
  role_added: RoleAddedTrigger.configType,
  role_removed: RoleRemovedTrigger.configType,

  message_spam: MessageSpamTrigger.configType,
  mention_spam: MentionSpamTrigger.configType,
  link_spam: LinkSpamTrigger.configType,
  attachment_spam: AttachmentSpamTrigger.configType,
  emoji_spam: EmojiSpamTrigger.configType,
  line_spam: LineSpamTrigger.configType,
  character_spam: CharacterSpamTrigger.configType,
  member_join_spam: MemberJoinSpamTrigger.configType,
  sticker_spam: StickerSpamTrigger.configType,

  counter_trigger: CounterTrigger.configType,

  note: NoteTrigger.configType,
  warn: WarnTrigger.configType,
  mute: MuteTrigger.configType,
  unmute: UnmuteTrigger.configType,
  kick: KickTrigger.configType,
  ban: BanTrigger.configType,
  unban: UnbanTrigger.configType,

  antiraid_level: AntiraidLevelTrigger.configType,
});
