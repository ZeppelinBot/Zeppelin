import { AutomodTriggerBlueprint } from "../helpers.js";
import { AntiraidLevelTrigger } from "./antiraidLevel.js";
import { AnyMessageTrigger } from "./anyMessage.js";
import { AttachmentSpamTrigger } from "./attachmentSpam.js";
import { BanTrigger } from "./ban.js";
import { CharacterSpamTrigger } from "./characterSpam.js";
import { CounterTrigger } from "./counterTrigger.js";
import { EmojiSpamTrigger } from "./emojiSpam.js";
import { HasAttachmentsTrigger } from "./hasAttachments.js";
import { KickTrigger } from "./kick.js";
import { LineSpamTrigger } from "./lineSpam.js";
import { LinkSpamTrigger } from "./linkSpam.js";
import { MatchAttachmentTypeTrigger } from "./matchAttachmentType.js";
import { MatchInvitesTrigger } from "./matchInvites.js";
import { MatchLinksTrigger } from "./matchLinks.js";
import { MatchMimeTypeTrigger } from "./matchMimeType.js";
import { MatchRegexTrigger } from "./matchRegex.js";
import { MatchWordsTrigger } from "./matchWords.js";
import { MemberJoinTrigger } from "./memberJoin.js";
import { MemberJoinSpamTrigger } from "./memberJoinSpam.js";
import { MemberLeaveTrigger } from "./memberLeave.js";
import { MentionSpamTrigger } from "./mentionSpam.js";
import { MessageSpamTrigger } from "./messageSpam.js";
import { MuteTrigger } from "./mute.js";
import { NoteTrigger } from "./note.js";
import { RoleAddedTrigger } from "./roleAdded.js";
import { RoleRemovedTrigger } from "./roleRemoved.js";
import { StickerSpamTrigger } from "./stickerSpam.js";
import { ThreadArchiveTrigger } from "./threadArchive.js";
import { ThreadCreateTrigger } from "./threadCreate.js";
import { ThreadCreateSpamTrigger } from "./threadCreateSpam.js";
import { ThreadDeleteTrigger } from "./threadDelete.js";
import { ThreadUnarchiveTrigger } from "./threadUnarchive.js";
import { UnbanTrigger } from "./unban.js";
import { UnmuteTrigger } from "./unmute.js";
import { WarnTrigger } from "./warn.js";

export const availableTriggers: Record<string, AutomodTriggerBlueprint<any, any>> = {
  any_message: AnyMessageTrigger,

  match_words: MatchWordsTrigger,
  match_regex: MatchRegexTrigger,
  match_invites: MatchInvitesTrigger,
  match_links: MatchLinksTrigger,
  has_attachments: HasAttachmentsTrigger,
  match_attachment_type: MatchAttachmentTypeTrigger,
  match_mime_type: MatchMimeTypeTrigger,
  member_join: MemberJoinTrigger,
  member_leave: MemberLeaveTrigger,
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
  thread_create_spam: ThreadCreateSpamTrigger,

  counter_trigger: CounterTrigger,

  note: NoteTrigger,
  warn: WarnTrigger,
  mute: MuteTrigger,
  unmute: UnmuteTrigger,
  kick: KickTrigger,
  ban: BanTrigger,
  unban: UnbanTrigger,

  antiraid_level: AntiraidLevelTrigger,

  thread_create: ThreadCreateTrigger,
  thread_delete: ThreadDeleteTrigger,
  thread_archive: ThreadArchiveTrigger,
  thread_unarchive: ThreadUnarchiveTrigger,
};
