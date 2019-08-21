import { ZeppelinPlugin } from "./ZeppelinPlugin";
import * as t from "io-ts";
import {
  convertDelayStringToMS,
  getEmojiInString,
  getInviteCodesInString,
  getRoleMentions,
  getUrlsInString,
  getUserMentions,
  MINUTES,
  noop,
  tNullable,
} from "../utils";
import { decorators as d } from "knub";
import { mergeConfig } from "knub/dist/configUtils";
import { Invite, Member, Message } from "eris";
import escapeStringRegexp from "escape-string-regexp";
import { SimpleCache } from "../SimpleCache";
import { Queue } from "../Queue";
import Timeout = NodeJS.Timeout;
import { ModActionsPlugin } from "./ModActions";
import { MutesPlugin } from "./Mutes";

type MessageInfo = { channelId: string; messageId: string };

type TextTriggerWithMultipleMatchTypes = {
  match_messages: boolean;
  match_embeds: boolean;
  match_usernames: boolean;
  match_nicknames: boolean;
};

interface TriggerMatchResult {
  type: string;
}

interface MessageTextTriggerMatchResult extends TriggerMatchResult {
  type: "message" | "embed";
  str: string;
  userId: string;
  messageInfo: MessageInfo;
}

interface OtherTextTriggerMatchResult extends TriggerMatchResult {
  type: "username" | "nickname";
  str: string;
  userId: string;
}

type TextTriggerMatchResult = MessageTextTriggerMatchResult | OtherTextTriggerMatchResult;

interface TextSpamTriggerMatchResult extends TriggerMatchResult {
  type: "textspam";
  actionType: RecentActionType;
  channelId: string;
  userId: string;
  messageInfos: MessageInfo[];
}

interface RaidSpamTriggerMatchResult extends TriggerMatchResult {
  type: "raidspam";
  actionType: RecentActionType;
  channelId: string;
  userIds: string[];
  messageInfos: MessageInfo[];
}

interface OtherSpamTriggerMatchResult extends TriggerMatchResult {
  type: "otherspam";
  actionType: RecentActionType;
  userIds: string[];
}

type AnyTriggerMatchResult =
  | TextTriggerMatchResult
  | TextSpamTriggerMatchResult
  | RaidSpamTriggerMatchResult
  | OtherSpamTriggerMatchResult;

/**
 * TRIGGERS
 */

const MatchWordsTrigger = t.type({
  words: t.array(t.string),
  case_sensitive: t.boolean,
  only_full_words: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
});
type TMatchWordsTrigger = t.TypeOf<typeof MatchWordsTrigger>;
const defaultMatchWordsTrigger: TMatchWordsTrigger = {
  words: [],
  case_sensitive: false,
  only_full_words: true,
  match_messages: true,
  match_embeds: true,
  match_usernames: false,
  match_nicknames: false,
};

const MatchRegexTrigger = t.type({
  patterns: t.array(t.string),
  case_sensitive: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
});
type TMatchRegexTrigger = t.TypeOf<typeof MatchRegexTrigger>;
const defaultMatchRegexTrigger: Partial<TMatchRegexTrigger> = {
  case_sensitive: false,
  match_messages: true,
  match_embeds: true,
  match_usernames: false,
  match_nicknames: false,
};

const MatchInvitesTrigger = t.type({
  include_guilds: tNullable(t.array(t.string)),
  exclude_guilds: tNullable(t.array(t.string)),
  include_invite_codes: tNullable(t.array(t.string)),
  exclude_invite_codes: tNullable(t.array(t.string)),
  allow_group_dm_invites: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
});
type TMatchInvitesTrigger = t.TypeOf<typeof MatchInvitesTrigger>;
const defaultMatchInvitesTrigger: Partial<TMatchInvitesTrigger> = {
  allow_group_dm_invites: false,
  match_messages: true,
  match_embeds: true,
  match_usernames: false,
  match_nicknames: false,
};

const MatchLinksTrigger = t.type({
  include_domains: tNullable(t.array(t.string)),
  exclude_domains: tNullable(t.array(t.string)),
  include_subdomains: t.boolean,
  match_messages: t.boolean,
  match_embeds: t.boolean,
  match_usernames: t.boolean,
  match_nicknames: t.boolean,
});
type TMatchLinksTrigger = t.TypeOf<typeof MatchLinksTrigger>;
const defaultMatchLinksTrigger: Partial<TMatchLinksTrigger> = {
  include_subdomains: true,
  match_messages: true,
  match_embeds: true,
  match_usernames: false,
  match_nicknames: false,
};

const BaseSpamTrigger = t.type({
  amount: t.number,
  within: t.string,
});
const BaseTextSpamTrigger = t.intersection([
  BaseSpamTrigger,
  t.type({
    per_channel: t.boolean,
  }),
]);
type TBaseTextSpamTrigger = t.TypeOf<typeof BaseTextSpamTrigger>;
const defaultTextSpamTrigger: Partial<t.TypeOf<typeof BaseTextSpamTrigger>> = {
  per_channel: true,
};

const MaxMessagesTrigger = BaseTextSpamTrigger;
type TMaxMessagesTrigger = t.TypeOf<typeof MaxMessagesTrigger>;
const MaxMentionsTrigger = BaseTextSpamTrigger;
type TMaxMentionsTrigger = t.TypeOf<typeof MaxMentionsTrigger>;
const MaxLinksTrigger = BaseTextSpamTrigger;
type TMaxLinksTrigger = t.TypeOf<typeof MaxLinksTrigger>;
const MaxAttachmentsTrigger = BaseTextSpamTrigger;
type TMaxAttachmentsTrigger = t.TypeOf<typeof MaxAttachmentsTrigger>;
const MaxEmojisTrigger = BaseTextSpamTrigger;
type TMaxEmojisTrigger = t.TypeOf<typeof MaxEmojisTrigger>;
const MaxLinesTrigger = BaseTextSpamTrigger;
type TMaxLinesTrigger = t.TypeOf<typeof MaxLinesTrigger>;
const MaxCharactersTrigger = BaseTextSpamTrigger;
type TMaxCharactersTrigger = t.TypeOf<typeof MaxCharactersTrigger>;
const MaxVoiceMovesTrigger = BaseSpamTrigger;
type TMaxVoiceMovesTrigger = t.TypeOf<typeof MaxVoiceMovesTrigger>;

/**
 * ACTIONS
 */

const CleanAction = t.boolean;

const WarnAction = t.type({
  reason: t.string,
});

const MuteAction = t.type({
  duration: t.string,
  reason: tNullable(t.string),
});

const KickAction = t.type({
  reason: tNullable(t.string),
});

const BanAction = t.type({
  reason: tNullable(t.string),
});

const AlertAction = t.type({
  text: t.string,
});

/**
 * FULL CONFIG SCHEMA
 */

const Rule = t.type({
  enabled: t.boolean,
  name: t.string,
  presets: tNullable(t.array(t.string)),
  triggers: t.array(
    t.type({
      match_words: tNullable(MatchWordsTrigger),
      match_regex: tNullable(MatchRegexTrigger),
      match_invites: tNullable(MatchInvitesTrigger),
      match_links: tNullable(MatchLinksTrigger),
      max_messages: tNullable(MaxMessagesTrigger),
      max_mentions: tNullable(MaxMentionsTrigger),
      max_links: tNullable(MaxLinksTrigger),
      max_attachments: tNullable(MaxAttachmentsTrigger),
      max_emojis: tNullable(MaxEmojisTrigger),
      max_lines: tNullable(MaxLinesTrigger),
      max_characters: tNullable(MaxCharactersTrigger),
      max_voice_moves: tNullable(MaxVoiceMovesTrigger),
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
  }),
});
type TRule = t.TypeOf<typeof Rule>;

const ConfigSchema = t.type({
  rules: t.record(t.string, Rule),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

/**
 * DEFAULTS
 */

const defaultTriggers = {
  match_words: defaultMatchWordsTrigger,
};

/**
 * MISC
 */

enum RecentActionType {
  Message = 1,
  Mention,
  Link,
  Attachment,
  Emoji,
  Line,
  Character,
  VoiceChannelMove,
}

interface BaseRecentAction {
  identifier: string;
  timestamp: number;
  count: number;
}

type TextRecentAction = BaseRecentAction & {
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

type OtherRecentAction = BaseRecentAction & {
  type: RecentActionType.VoiceChannelMove;
};

type RecentAction = TextRecentAction | OtherRecentAction;

const MAX_SPAM_CHECK_TIMESPAN = 5 * MINUTES;

const inviteCache = new SimpleCache(10 * MINUTES);

export class AutomodPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "automod";
  protected static configSchema = ConfigSchema;
  public static dependencies = ["mod_actions", "mutes"];

  protected unloaded = false;

  // Handle automod checks/actions in a queue so we don't get overlap on the same user
  protected automodQueue: Queue;

  // Recent actions are used to detect "max_*" type of triggers, i.e. spam triggers
  protected recentActions: RecentAction[];
  protected recentActionClearInterval: Timeout;

  // After a spam trigger is tripped and the rule's action carried out, a short "grace period" will be placed on the user.
  // During this grace period, if the user repeats the same type of recent action that tripped the rule, that message will
  // be deleted and no further action will be carried out. This is mainly to account for the delay between the spam message
  // being posted and the bot reacting to it, during which the user could keep posting more spam.
  protected spamGracePeriods: Array<{ key: string; type: RecentActionType; expiresAt: number }>;
  protected spamGracePriodClearInterval: Timeout;

  protected modActions: ModActionsPlugin;
  protected mutes: MutesPlugin;

  protected static preprocessStaticConfig(config) {
    if (config.rules && typeof config.rules === "object") {
      // Loop through each rule
      for (const [name, rule] of Object.entries(config.rules)) {
        if (rule == null || typeof rule !== "object") continue;

        rule["name"] = name;

        // If the rule doesn't have an explicitly set "enabled" property, set it to true
        if (rule["enabled"] == null) {
          rule["enabled"] = true;
        }

        // Loop through the rule's triggers
        if (rule["triggers"] != null && Array.isArray(rule["triggers"])) {
          for (const trigger of rule["triggers"]) {
            if (trigger == null || typeof trigger !== "object") continue;
            // Apply default triggers to the triggers used in this rule
            for (const [defaultTriggerName, defaultTrigger] of Object.entries(defaultTriggers)) {
              if (trigger[defaultTriggerName] && typeof trigger[defaultTriggerName] === "object") {
                trigger[defaultTriggerName] = mergeConfig({}, defaultTrigger, trigger[defaultTriggerName]);
              }
            }
          }
        }
      }
    }

    return config;
  }

  public static getStaticDefaultOptions() {
    return {
      rules: [],
    };
  }

  protected onLoad() {
    this.automodQueue = new Queue();
    this.modActions = this.getPlugin("mod_actions");
  }

  protected onUnload() {
    this.unloaded = true;
    clearInterval(this.recentActionClearInterval);
    clearInterval(this.spamGracePriodClearInterval);
  }

  protected evaluateMatchWordsTrigger(trigger: TMatchWordsTrigger, str: string): boolean {
    for (const word of trigger.words) {
      const pattern = trigger.only_full_words ? `\b${escapeStringRegexp(word)}\b` : escapeStringRegexp(word);

      const regex = new RegExp(pattern, trigger.case_sensitive ? "" : "i");
      return regex.test(str);
    }
  }

  protected evaluateMatchRegexTrigger(trigger: TMatchRegexTrigger, str: string): boolean {
    // TODO: Time limit regexes
    for (const pattern of trigger.patterns) {
      const regex = new RegExp(pattern, trigger.case_sensitive ? "" : "i");
      return regex.test(str);
    }
  }

  protected async evaluateMatchInvitesTrigger(trigger: TMatchInvitesTrigger, str: string): Promise<boolean> {
    const inviteCodes = getInviteCodesInString(str);
    if (inviteCodes.length === 0) return false;

    const uniqueInviteCodes = Array.from(new Set(inviteCodes));

    for (const code of uniqueInviteCodes) {
      if (trigger.include_invite_codes && trigger.include_invite_codes.includes(code)) {
        return true;
      }
      if (trigger.exclude_invite_codes && !trigger.exclude_invite_codes.includes(code)) {
        return true;
      }
    }

    const invites: Array<Invite | void> = await Promise.all(
      uniqueInviteCodes.map(async code => {
        if (inviteCache.has(code)) {
          return inviteCache.get(code);
        } else {
          const invite = await this.bot.getInvite(code).catch(noop);
          inviteCache.set(code, invite);
          return invite;
        }
      }),
    );

    for (const invite of invites) {
      if (!invite) return true;
      if (trigger.include_guilds && trigger.include_guilds.includes(invite.guild.id)) {
        return true;
      }
      if (trigger.exclude_guilds && !trigger.exclude_guilds.includes(invite.guild.id)) {
        return true;
      }
    }

    return false;
  }

  protected evaluateMatchLinksTrigger(trigger: TMatchLinksTrigger, str: string): boolean {
    const links = getUrlsInString(str, true);
    for (const link of links) {
      const normalizedHostname = link.hostname.toLowerCase();

      if (trigger.include_domains) {
        for (const domain of trigger.include_domains) {
          const normalizedDomain = domain.toLowerCase();
          if (normalizedDomain === normalizedHostname) {
            return true;
          }
          if (trigger.include_subdomains && normalizedHostname.endsWith(`.${domain}`)) {
            return true;
          }
        }
      }

      if (trigger.exclude_domains) {
        for (const domain of trigger.exclude_domains) {
          const normalizedDomain = domain.toLowerCase();
          if (normalizedDomain === normalizedHostname) {
            return false;
          }
          if (trigger.include_subdomains && normalizedHostname.endsWith(`.${domain}`)) {
            return false;
          }
        }

        return true;
      }
    }

    return false;
  }

  protected matchTextSpamTrigger(
    recentActionType: RecentActionType,
    trigger: TBaseTextSpamTrigger,
    msg: Message,
  ): TextSpamTriggerMatchResult {
    const since = msg.timestamp - convertDelayStringToMS(trigger.within);
    const recentActions = trigger.per_channel
      ? this.getMatchingRecentActions(recentActionType, `${msg.channel.id}-${msg.author.id}`, since)
      : this.getMatchingRecentActions(recentActionType, msg.author.id, since);
    if (recentActions.length > trigger.amount) {
      return {
        type: "textspam",
        actionType: recentActionType,
        channelId: trigger.per_channel ? msg.channel.id : null,
        messageInfos: recentActions.map(action => (action as TextRecentAction).messageInfo),
        userId: msg.author.id,
      };
    }

    return null;
  }

  protected async matchMultipleTextTypesOnMessage(
    trigger: TextTriggerWithMultipleMatchTypes,
    msg: Message,
    cb,
  ): Promise<TextTriggerMatchResult> {
    const messageInfo: MessageInfo = { channelId: msg.channel.id, messageId: msg.id };

    if (trigger.match_messages) {
      const str = msg.content;
      const match = await cb(str);
      if (match) return { type: "message", str, userId: msg.author.id, messageInfo };
    }

    if (trigger.match_embeds && msg.embeds.length) {
      const str = JSON.stringify(msg.embeds[0]);
      const match = await cb(str);
      if (match) return { type: "embed", str, userId: msg.author.id, messageInfo };
    }

    if (trigger.match_usernames) {
      const str = `${msg.author.username}#${msg.author.discriminator}`;
      const match = await cb(str);
      if (match) return { type: "username", str, userId: msg.author.id };
    }

    if (trigger.match_nicknames && msg.member.nick) {
      const str = msg.member.nick;
      const match = await cb(str);
      if (match) return { type: "nickname", str, userId: msg.author.id };
    }

    return null;
  }

  protected async matchMultipleTextTypesOnMember(
    trigger: TextTriggerWithMultipleMatchTypes,
    member: Member,
    cb,
  ): Promise<TextTriggerMatchResult> {
    if (trigger.match_usernames) {
      const str = `${member.user.username}#${member.user.discriminator}`;
      const match = await cb(str);
      if (match) return { type: "username", str, userId: member.id };
    }

    if (trigger.match_nicknames && member.nick) {
      const str = member.nick;
      const match = await cb(str);
      if (match) return { type: "nickname", str, userId: member.id };
    }

    return null;
  }

  /**
   * Returns whether the triggers in the rule match the given message
   */
  protected async matchRuleToMessage(
    rule: TRule,
    msg: Message,
  ): Promise<TextTriggerMatchResult | TextSpamTriggerMatchResult> {
    for (const trigger of rule.triggers) {
      if (trigger.match_words) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_words, msg, str => {
          return this.evaluateMatchWordsTrigger(trigger.match_words, str);
        });
        if (match) return match;
      }

      if (trigger.match_regex) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_regex, msg, str => {
          return this.evaluateMatchRegexTrigger(trigger.match_regex, str);
        });
        if (match) return match;
      }

      if (trigger.match_invites) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_invites, msg, str => {
          return this.evaluateMatchInvitesTrigger(trigger.match_invites, str);
        });
        if (match) return match;
      }

      if (trigger.match_links) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_links, msg, str => {
          return this.evaluateMatchLinksTrigger(trigger.match_links, str);
        });
        if (match) return match;
      }

      if (trigger.max_messages) {
        const match = this.matchTextSpamTrigger(RecentActionType.Message, trigger.max_messages, msg);
        if (match) return match;
      }

      if (trigger.max_mentions) {
        const match = this.matchTextSpamTrigger(RecentActionType.Mention, trigger.max_mentions, msg);
        if (match) return match;
      }

      if (trigger.max_links) {
        const match = this.matchTextSpamTrigger(RecentActionType.Link, trigger.max_links, msg);
        if (match) return match;
      }

      if (trigger.max_attachments) {
        const match = this.matchTextSpamTrigger(RecentActionType.Attachment, trigger.max_attachments, msg);
        if (match) return match;
      }

      if (trigger.max_emojis) {
        const match = this.matchTextSpamTrigger(RecentActionType.Emoji, trigger.max_emojis, msg);
        if (match) return match;
      }

      if (trigger.max_lines) {
        const match = this.matchTextSpamTrigger(RecentActionType.Line, trigger.max_lines, msg);
        if (match) return match;
      }

      if (trigger.max_characters) {
        const match = this.matchTextSpamTrigger(RecentActionType.Character, trigger.max_characters, msg);
        if (match) return match;
      }
    }

    return null;
  }

  /**
   * Logs recent actions for spam detection purposes
   */
  protected async logRecentActionsForMessage(msg: Message) {
    const timestamp = msg.timestamp;
    const globalIdentifier = msg.author.id;
    const perChannelIdentifier = `${msg.channel.id}-${msg.author.id}`;
    const messageInfo: MessageInfo = { channelId: msg.channel.id, messageId: msg.id };

    this.recentActions.push({
      type: RecentActionType.Message,
      identifier: globalIdentifier,
      timestamp,
      count: 1,
      messageInfo,
    });
    this.recentActions.push({
      type: RecentActionType.Message,
      identifier: perChannelIdentifier,
      timestamp,
      count: 1,
      messageInfo,
    });

    const mentionCount = getUserMentions(msg.content || "").length + getRoleMentions(msg.content || "").length;
    if (mentionCount) {
      this.recentActions.push({
        type: RecentActionType.Mention,
        identifier: globalIdentifier,
        timestamp,
        count: mentionCount,
        messageInfo,
      });
      this.recentActions.push({
        type: RecentActionType.Mention,
        identifier: perChannelIdentifier,
        timestamp,
        count: mentionCount,
        messageInfo,
      });
    }

    const linkCount = getUrlsInString(msg.content || "").length;
    if (linkCount) {
      this.recentActions.push({
        type: RecentActionType.Link,
        identifier: globalIdentifier,
        timestamp,
        count: linkCount,
        messageInfo,
      });
      this.recentActions.push({
        type: RecentActionType.Link,
        identifier: perChannelIdentifier,
        timestamp,
        count: linkCount,
        messageInfo,
      });
    }

    const attachmentCount = msg.attachments.length;
    if (attachmentCount) {
      this.recentActions.push({
        type: RecentActionType.Attachment,
        identifier: globalIdentifier,
        timestamp,
        count: attachmentCount,
        messageInfo,
      });
      this.recentActions.push({
        type: RecentActionType.Attachment,
        identifier: perChannelIdentifier,
        timestamp,
        count: attachmentCount,
        messageInfo,
      });
    }

    const emojiCount = getEmojiInString(msg.content || "").length;
    if (emojiCount) {
      this.recentActions.push({
        type: RecentActionType.Emoji,
        identifier: globalIdentifier,
        timestamp,
        count: emojiCount,
        messageInfo,
      });
      this.recentActions.push({
        type: RecentActionType.Emoji,
        identifier: perChannelIdentifier,
        timestamp,
        count: emojiCount,
        messageInfo,
      });
    }

    // + 1 is for the first line of the message (which doesn't have a line break)
    const lineCount = msg.content ? msg.content.match(/\n/g).length + 1 : 0;
    if (lineCount) {
      this.recentActions.push({
        type: RecentActionType.Line,
        identifier: globalIdentifier,
        timestamp,
        count: lineCount,
        messageInfo,
      });
      this.recentActions.push({
        type: RecentActionType.Line,
        identifier: perChannelIdentifier,
        timestamp,
        count: lineCount,
        messageInfo,
      });
    }

    const characterCount = [...(msg.content || "")].length;
    if (characterCount) {
      this.recentActions.push({
        type: RecentActionType.Character,
        identifier: globalIdentifier,
        timestamp,
        count: characterCount,
        messageInfo,
      });
      this.recentActions.push({
        type: RecentActionType.Character,
        identifier: perChannelIdentifier,
        timestamp,
        count: characterCount,
        messageInfo,
      });
    }
  }

  protected getMatchingRecentActions(type: RecentActionType, identifier: string, since: number) {
    return this.recentActions.filter(action => {
      return action.type === type && action.identifier === identifier && action.timestamp >= since;
    });
  }

  protected async applyActionsOnMatch(rule: TRule, matchResult: AnyTriggerMatchResult) {
    if (rule.actions.clean) {
      if (matchResult.type === "message" || matchResult.type === "embed") {
        await this.bot.deleteMessage(matchResult.messageInfo.channelId, matchResult.messageInfo.messageId).catch(noop);
      } else if (matchResult.type === "textspam" || matchResult.type === "raidspam") {
        for (const { channelId, messageId } of matchResult.messageInfos) {
          await this.bot.deleteMessage(channelId, messageId).catch(noop);
        }
      }
    }

    if (rule.actions.warn) {
      const reason = rule.actions.mute.reason || "Warned automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [`Matched automod rule "${rule.name}"`],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        const member = await this.getMember(matchResult.userId);
        if (member) {
          await this.modActions.warnMember(member, reason, caseArgs);
        }
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          const member = await this.getMember(userId);
          if (member) {
            await this.modActions.warnMember(member, reason, caseArgs);
          }
        }
      }
    }

    if (rule.actions.mute) {
      const duration = rule.actions.mute.duration ? convertDelayStringToMS(rule.actions.mute.duration) : null;
      const reason = rule.actions.mute.reason || "Muted automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [`Matched automod rule "${rule.name}"`],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        await this.mutes.muteUser(matchResult.userId, duration, reason, caseArgs);
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          await this.mutes.muteUser(userId, duration, reason, caseArgs);
        }
      }
    }

    if (rule.actions.kick) {
      const reason = rule.actions.kick.reason || "Kicked automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [`Matched automod rule "${rule.name}"`],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        const member = await this.getMember(matchResult.userId);
        if (member) {
          await this.modActions.kickMember(member, reason, caseArgs);
        }
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          const member = await this.getMember(userId);
          if (member) {
            await this.modActions.kickMember(member, reason, caseArgs);
          }
        }
      }
    }

    if (rule.actions.ban) {
      const reason = rule.actions.ban.reason || "Banned automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [`Matched automod rule "${rule.name}"`],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        await this.modActions.banUserId(matchResult.userId, reason, caseArgs);
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          await this.modActions.banUserId(userId, reason, caseArgs);
        }
      }
    }

    // TODO: Alert action (and AUTOMOD_ALERT log type)
  }

  @d.event("messageCreate")
  protected onMessageCreate(msg: Message) {
    this.automodQueue.add(async () => {
      if (this.unloaded) return;

      await this.logRecentActionsForMessage(msg);

      const config = this.getMatchingConfig({ message: msg });
      for (const [name, rule] of Object.entries(config.rules)) {
        const matchResult = await this.matchRuleToMessage(rule, msg);
        if (matchResult) {
          await this.applyActionsOnMatch(rule, matchResult);
        }
      }
    });
  }
}
