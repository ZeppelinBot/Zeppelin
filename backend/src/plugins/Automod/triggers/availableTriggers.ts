import * as t from "io-ts";
import { MatchWordsTrigger } from "./matchWords";
import { AutomodTriggerBlueprint } from "../helpers";
import { MessageSpamTrigger } from "./messageSpam";
import { MentionSpamTrigger } from "./mentionSpam";
import { LinkSpamTrigger } from "./linkSpam";
import { AttachmentSpamTrigger } from "./attachmentSpam";
import { EmojiSpamTrigger } from "./emojiSpam";
import { LineSpamTrigger } from "./lineSpam";
import { CharacterSpamTrigger } from "./characterSpam";
import { MatchRegexTrigger } from "./matchRegex";
import { MatchInvitesTrigger } from "./matchInvites";
import { MatchLinksTrigger } from "./matchLinks";
import { MatchAttachmentTypeTrigger } from "./matchAttachmentType";

export const availableTriggers: Record<string, AutomodTriggerBlueprint<any, any>> = {
  match_words: MatchWordsTrigger,
  match_regex: MatchRegexTrigger,
  match_invites: MatchInvitesTrigger,
  match_links: MatchLinksTrigger,
  match_attachment_type: MatchAttachmentTypeTrigger,

  message_spam: MessageSpamTrigger,
  mention_spam: MentionSpamTrigger,
  link_spam: LinkSpamTrigger,
  attachment_spam: AttachmentSpamTrigger,
  emoji_spam: EmojiSpamTrigger,
  line_spam: LineSpamTrigger,
  character_spam: CharacterSpamTrigger,
};

export const AvailableTriggers = t.type({
  match_words: MatchWordsTrigger.configType,
  match_regex: MatchRegexTrigger.configType,
  match_invites: MatchInvitesTrigger.configType,
  match_links: MatchLinksTrigger.configType,
  match_attachment_type: MatchAttachmentTypeTrigger.configType,

  message_spam: MessageSpamTrigger.configType,
  mention_spam: MentionSpamTrigger.configType,
  link_spam: LinkSpamTrigger.configType,
  attachment_spam: AttachmentSpamTrigger.configType,
  emoji_spam: EmojiSpamTrigger.configType,
  line_spam: LineSpamTrigger.configType,
  character_spam: CharacterSpamTrigger.configType,
});
