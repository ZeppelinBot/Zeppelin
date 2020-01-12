import { PluginInfo, trimPluginDescription, ZeppelinPlugin } from "./ZeppelinPlugin";
import * as t from "io-ts";
import {
  convertDelayStringToMS,
  disableInlineCode,
  disableLinkPreviews,
  getEmojiInString,
  getInviteCodesInString,
  getRoleMentions,
  getUrlsInString,
  getUserMentions,
  messageSummary,
  MINUTES,
  noop,
  SECONDS,
  stripObjectToScalars,
  tDeepPartial,
  tNullable,
  UnknownUser,
  verboseChannelMention,
} from "../utils";
import { configUtils, CooldownManager } from "knub";
import { Member, TextChannel } from "eris";
import escapeStringRegexp from "escape-string-regexp";
import { SimpleCache } from "../SimpleCache";
import { Queue } from "../Queue";
import { ModActionsPlugin } from "./ModActions";
import { MutesPlugin } from "./Mutes";
import { LogsPlugin } from "./Logs";
import { LogType } from "../data/LogType";
import { TSafeRegex } from "../validatorUtils";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { GuildArchives } from "../data/GuildArchives";
import { GuildLogs } from "../data/GuildLogs";
import { SavedMessage } from "../data/entities/SavedMessage";
import moment from "moment-timezone";
import { renderTemplate } from "../templateFormatter";
import { transliterate } from "transliteration";
import Timeout = NodeJS.Timeout;

type MessageInfo = { channelId: string; messageId: string };

type TextTriggerWithMultipleMatchTypes = {
  match_messages: boolean;
  match_embeds: boolean;
  match_visible_names: boolean;
  match_usernames: boolean;
  match_nicknames: boolean;
  match_custom_status: boolean;
};

interface TriggerMatchResult {
  trigger: string;
  type: string;
}

interface MessageTextTriggerMatchResult<T = any> extends TriggerMatchResult {
  type: "message" | "embed";
  str: string;
  userId: string;
  messageInfo: MessageInfo;
  matchedValue: T;
}

interface OtherTextTriggerMatchResult<T = any> extends TriggerMatchResult {
  type: "username" | "nickname" | "visiblename" | "customstatus";
  str: string;
  userId: string;
  matchedValue: T;
}

type TextTriggerMatchResult<T = any> = MessageTextTriggerMatchResult<T> | OtherTextTriggerMatchResult<T>;

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
  userId: string;
}

type AnyTriggerMatchResult =
  | TextTriggerMatchResult
  | TextSpamTriggerMatchResult
  | RaidSpamTriggerMatchResult
  | OtherSpamTriggerMatchResult;

/**
 * CONFIG SCHEMA FOR TRIGGERS
 */

const MatchWordsTrigger = t.type({
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
type TMatchWordsTrigger = t.TypeOf<typeof MatchWordsTrigger>;
const defaultMatchWordsTrigger: Partial<TMatchWordsTrigger> = {
  case_sensitive: false,
  only_full_words: true,
  normalize: false,
  loose_matching: false,
  loose_matching_threshold: 4,
  match_messages: true,
  match_embeds: true,
  match_visible_names: false,
  match_usernames: false,
  match_nicknames: false,
  match_custom_status: false,
};

const MatchRegexTrigger = t.type({
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
type TMatchRegexTrigger = t.TypeOf<typeof MatchRegexTrigger>;
const defaultMatchRegexTrigger: Partial<TMatchRegexTrigger> = {
  case_sensitive: false,
  normalize: false,
  match_messages: true,
  match_embeds: true,
  match_visible_names: false,
  match_usernames: false,
  match_nicknames: false,
  match_custom_status: false,
};

const MatchInvitesTrigger = t.type({
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
type TMatchInvitesTrigger = t.TypeOf<typeof MatchInvitesTrigger>;
const defaultMatchInvitesTrigger: Partial<TMatchInvitesTrigger> = {
  allow_group_dm_invites: false,
  match_messages: true,
  match_embeds: true,
  match_visible_names: false,
  match_usernames: false,
  match_nicknames: false,
  match_custom_status: false,
};

const MatchLinksTrigger = t.type({
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
type TMatchLinksTrigger = t.TypeOf<typeof MatchLinksTrigger>;
const defaultMatchLinksTrigger: Partial<TMatchLinksTrigger> = {
  include_subdomains: true,
  match_messages: true,
  match_embeds: true,
  match_visible_names: false,
  match_usernames: false,
  match_nicknames: false,
  match_custom_status: false,
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

const MessageSpamTrigger = BaseTextSpamTrigger;
type TMessageSpamTrigger = t.TypeOf<typeof MessageSpamTrigger>;
const MentionSpamTrigger = BaseTextSpamTrigger;
type TMentionSpamTrigger = t.TypeOf<typeof MentionSpamTrigger>;
const LinkSpamTrigger = BaseTextSpamTrigger;
type TLinkSpamTrigger = t.TypeOf<typeof LinkSpamTrigger>;
const AttachmentSpamTrigger = BaseTextSpamTrigger;
type TAttachmentSpamTrigger = t.TypeOf<typeof AttachmentSpamTrigger>;
const EmojiSpamTrigger = BaseTextSpamTrigger;
type TEmojiSpamTrigger = t.TypeOf<typeof EmojiSpamTrigger>;
const LineSpamTrigger = BaseTextSpamTrigger;
type TLineSpamTrigger = t.TypeOf<typeof LineSpamTrigger>;
const CharacterSpamTrigger = BaseTextSpamTrigger;
type TCharacterSpamTrigger = t.TypeOf<typeof CharacterSpamTrigger>;
const VoiceMoveSpamTrigger = BaseSpamTrigger;
type TVoiceMoveSpamTrigger = t.TypeOf<typeof VoiceMoveSpamTrigger>;

/**
 * CONFIG SCHEMA FOR ACTIONS
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
  channel: t.string,
  text: t.string,
});

const ChangeNicknameAction = t.type({
  name: t.string,
});

const LogAction = t.boolean;

const AddRolesAction = t.array(t.string);
const RemoveRolesAction = t.array(t.string);

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
      message_spam: tNullable(MessageSpamTrigger),
      mention_spam: tNullable(MentionSpamTrigger),
      link_spam: tNullable(LinkSpamTrigger),
      attachment_spam: tNullable(AttachmentSpamTrigger),
      emoji_spam: tNullable(EmojiSpamTrigger),
      line_spam: tNullable(LineSpamTrigger),
      character_spam: tNullable(CharacterSpamTrigger),
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
  }),
  cooldown: tNullable(t.string),
});
type TRule = t.TypeOf<typeof Rule>;

const ConfigSchema = t.type({
  rules: t.record(t.string, Rule),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const PartialConfigSchema = tDeepPartial(ConfigSchema);

/**
 * DEFAULTS
 */

const defaultTriggers = {
  match_words: defaultMatchWordsTrigger,
  match_regex: defaultMatchRegexTrigger,
  match_invites: defaultMatchInvitesTrigger,
  match_links: defaultMatchLinksTrigger,
  message_spam: defaultTextSpamTrigger,
  mention_spam: defaultTextSpamTrigger,
  link_spam: defaultTextSpamTrigger,
  attachment_spam: defaultTextSpamTrigger,
  emoji_spam: defaultTextSpamTrigger,
  line_spam: defaultTextSpamTrigger,
  character_spam: defaultTextSpamTrigger,
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

type RecentAction = (TextRecentAction | OtherRecentAction) & { expiresAt: number };

const SPAM_GRACE_PERIOD_LENGTH = 10 * SECONDS;
const RECENT_ACTION_EXPIRY_TIME = 2 * MINUTES;
const MAX_RECENTLY_DELETED_MESSAGES = 10;
const RECENT_NICKNAME_CHANGE_EXPIRY_TIME = 5 * MINUTES;

const inviteCache = new SimpleCache(10 * MINUTES);

/**
 * General plugin flow:
 * - When a message is posted:
 *   1. Run logRecentActionsForMessage() -- used for detecting spam
 *   2. Run matchRuleToMessage() for each automod rule. This checks if any triggers in the rule match the message.
 *   3. If a rule matched, run applyActionsOnMatch() for that rule/match
 */
export class AutomodPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "automod";
  public static configSchema = ConfigSchema;
  public static dependencies = ["mod_actions", "mutes", "logs"];

  public static pluginInfo: PluginInfo = {
    prettyName: "Automod",
    description: trimPluginDescription(`
      Allows specifying automated actions in response to triggers. Example use cases include word filtering and spam prevention.
    `),
    configurationGuide: trimPluginDescription(`
      The automod plugin is very customizable. For a full list of available triggers, actions, and their options, see Config schema at the bottom of this page.    
    
      ### Simple word filter
      Removes any messages that contain the word 'banana' and sends a warning to the user.
      Moderators (level >= 50) are ignored by the filter based on the override.
      
      ~~~yml
      automod:
        config:
          rules:
            my_filter:
              triggers:
              - match_words:
                  words: ['banana']
                  case_sensitive: false
                  only_full_words: true
              actions:
                clean: true
                warn:
                  reason: 'Do not talk about bananas!'
        overrides:
        - level: '>=50'
          config:
            rules:
              my_filter:
                enabled: false
      ~~~
      
      ### Spam detection
      This example includes 2 filters:
      
      - The first one is triggered if a user sends 5 messages within 10 seconds OR 3 attachments within 60 seconds.
        The messages are deleted and the user is muted for 5 minutes.
      - The second filter is triggered if a user sends more than 2 emoji within 5 seconds.
        The messages are deleted but the user is not muted.
      
      Moderators are ignored by both filters based on the override.
      
      ~~~yml
      automod:
        config:
          rules:
            my_spam_filter:
              triggers:
              - message_spam:
                  amount: 5
                  within: 10s
              - attachment_spam:
                  amount: 3
                  within: 60s
              actions:
                clean: true
                mute:
                  duration: 5m
                  reason: 'Auto-muted for spam'
            my_second_filter:
              triggers:
              - message_spam:
                  amount: 5
                  within: 10s
              actions:
                clean: true
        overrides:
        - level: '>=50'
          config:
            rules:
              my_spam_filter:
                enabled: false
              my_second_filter:
                enabled: false
      ~~~
      
      ### Custom status alerts
      This example sends an alert any time a user with a matching custom status sends a message.
      
      ~~~yml
      automod:
        config:
          rules:
            bad_custom_statuses:
              triggers:
              - match_words:
                  words: ['banana']
                  match_custom_status: true
              actions:
                alert:
                  channel: "473087035574321152"
                  text: |-
                    Bad custom status on user <@!{user.id}>:
                    {matchSummary}
      ~~~
    `),
  };

  protected unloaded = false;

  // Handle automod checks/actions in a queue so we don't get overlap on the same user
  protected automodQueue: Queue;

  // Recent actions are used to detect spam triggers
  protected recentActions: RecentAction[];
  protected recentActionClearInterval: Timeout;

  // After a spam trigger is tripped and the rule's action carried out, a short "grace period" will be placed on the user.
  // During this grace period, if the user repeats the same type of recent action that tripped the rule, that message will
  // be deleted and no further action will be carried out. This is mainly to account for the delay between the spam message
  // being posted and the bot reacting to it, during which the user could keep posting more spam.
  protected spamGracePeriods: Map<string, { expiresAt: number; deletedMessages: string[] }>; // Key = identifier-actionType
  protected spamGracePriodClearInterval: Timeout;

  protected recentlyDeletedMessages: string[];

  protected recentNicknameChanges: Map<string, { expiresAt: number }>;
  protected recentNicknameChangesClearInterval: Timeout;

  protected cooldownManager: CooldownManager;

  protected onMessageCreateFn;

  protected modActions: ModActionsPlugin;
  protected mutes: MutesPlugin;
  protected logs: LogsPlugin;

  protected savedMessages: GuildSavedMessages;
  protected archives: GuildArchives;
  protected guildLogs: GuildLogs;

  protected static preprocessStaticConfig(config: t.TypeOf<typeof PartialConfigSchema>) {
    if (config.rules) {
      // Loop through each rule
      for (const [name, rule] of Object.entries(config.rules)) {
        rule["name"] = name;

        // If the rule doesn't have an explicitly set "enabled" property, set it to true
        if (rule["enabled"] == null) {
          rule["enabled"] = true;
        }

        // Loop through the rule's triggers
        if (rule["triggers"]) {
          for (const trigger of rule["triggers"]) {
            // Apply default config to the triggers used in this rule
            for (const [defaultTriggerName, defaultTrigger] of Object.entries(defaultTriggers)) {
              if (trigger[defaultTriggerName]) {
                trigger[defaultTriggerName] = configUtils.mergeConfig({}, defaultTrigger, trigger[defaultTriggerName]);
              }
            }
          }
        }

        // Enable logging of automod actions by default
        if (rule["actions"]) {
          if (rule["actions"]["log"] == null) {
            rule["actions"]["log"] = true;
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

    this.recentActions = [];
    this.recentActionClearInterval = setInterval(() => this.clearOldRecentActions(), 1 * MINUTES);

    this.spamGracePeriods = new Map();
    this.spamGracePriodClearInterval = setInterval(() => this.clearExpiredGracePeriods(), 1 * SECONDS);

    this.recentlyDeletedMessages = [];

    this.recentNicknameChanges = new Map();
    this.recentNicknameChangesClearInterval = setInterval(() => this.clearExpiredRecentNicknameChanges(), 30 * SECONDS);

    this.cooldownManager = new CooldownManager();

    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.archives = GuildArchives.getGuildInstance(this.guildId);
    this.guildLogs = new GuildLogs(this.guildId);

    this.onMessageCreateFn = msg => this.onMessageCreate(msg);
    this.savedMessages.events.on("create", this.onMessageCreateFn);
  }

  protected getModActions(): ModActionsPlugin {
    return this.getPlugin("mod_actions");
  }

  protected getLogs(): LogsPlugin {
    return this.getPlugin("logs");
  }

  protected onUnload() {
    this.unloaded = true;
    this.savedMessages.events.off("create", this.onMessageCreateFn);
    clearInterval(this.recentActionClearInterval);
    clearInterval(this.spamGracePriodClearInterval);
    clearInterval(this.recentNicknameChangesClearInterval);
  }

  /**
   * @return Matched word
   */
  protected evaluateMatchWordsTrigger(trigger: TMatchWordsTrigger, str: string): null | string {
    if (trigger.normalize) {
      str = transliterate(str);
    }

    const looseMatchingThreshold = Math.min(Math.max(trigger.loose_matching_threshold, 1), 64);

    for (const word of trigger.words) {
      // When performing loose matching, allow any amount of whitespace or up to looseMatchingThreshold number of other
      // characters between the matched characters. E.g. if we're matching banana, a loose match could also match b a n a n a
      let pattern = trigger.loose_matching
        ? [...word].map(c => escapeStringRegexp(c)).join(`(?:\\s*|.{0,${looseMatchingThreshold})`)
        : escapeStringRegexp(word);

      if (trigger.only_full_words) {
        pattern = `\\b${pattern}\\b`;
      }

      const regex = new RegExp(pattern, trigger.case_sensitive ? "" : "i");
      const test = regex.test(str);
      if (test) return word;
    }

    return null;
  }

  /**
   * @return Matched regex pattern
   */
  protected evaluateMatchRegexTrigger(trigger: TMatchRegexTrigger, str: string): null | string {
    if (trigger.normalize) {
      str = transliterate(str);
    }

    // TODO: Time limit regexes
    for (const pattern of trigger.patterns) {
      const regex = new RegExp(pattern, trigger.case_sensitive ? "" : "i");
      const test = regex.test(str);
      if (test) return regex.source;
    }

    return null;
  }

  /**
   * @return Matched invite code
   */
  protected async evaluateMatchInvitesTrigger(trigger: TMatchInvitesTrigger, str: string): Promise<null | string> {
    const inviteCodes = getInviteCodesInString(str);
    if (inviteCodes.length === 0) return null;

    const uniqueInviteCodes = Array.from(new Set(inviteCodes));

    for (const code of uniqueInviteCodes) {
      if (trigger.include_invite_codes && trigger.include_invite_codes.includes(code)) {
        return code;
      }
      if (trigger.exclude_invite_codes && !trigger.exclude_invite_codes.includes(code)) {
        return code;
      }
    }

    for (const inviteCode of uniqueInviteCodes) {
      const invite = await this.resolveInvite(inviteCode);
      if (!invite) return inviteCode;

      if (trigger.include_guilds && trigger.include_guilds.includes(invite.guild.id)) {
        return inviteCode;
      }
      if (trigger.exclude_guilds && !trigger.exclude_guilds.includes(invite.guild.id)) {
        return inviteCode;
      }
    }

    return null;
  }

  /**
   * @return Matched link
   */
  protected evaluateMatchLinksTrigger(trigger: TMatchLinksTrigger, str: string): null | string {
    const links = getUrlsInString(str, true);

    for (const link of links) {
      const normalizedHostname = link.hostname.toLowerCase();

      if (trigger.include_domains) {
        for (const domain of trigger.include_domains) {
          const normalizedDomain = domain.toLowerCase();
          if (normalizedDomain === normalizedHostname) {
            return domain;
          }
          if (trigger.include_subdomains && normalizedHostname.endsWith(`.${domain}`)) {
            return domain;
          }
        }
      }

      if (trigger.exclude_domains) {
        for (const domain of trigger.exclude_domains) {
          const normalizedDomain = domain.toLowerCase();
          if (normalizedDomain === normalizedHostname) {
            return null;
          }
          if (trigger.include_subdomains && normalizedHostname.endsWith(`.${domain}`)) {
            return null;
          }
        }

        return link.toString();
      }
    }

    return null;
  }

  protected matchTextSpamTrigger(
    recentActionType: RecentActionType,
    trigger: TBaseTextSpamTrigger,
    msg: SavedMessage,
  ): Partial<TextSpamTriggerMatchResult> {
    const since = moment.utc(msg.posted_at).valueOf() - convertDelayStringToMS(trigger.within);
    const recentActions = trigger.per_channel
      ? this.getMatchingRecentActions(recentActionType, `${msg.channel_id}-${msg.user_id}`, since)
      : this.getMatchingRecentActions(recentActionType, msg.user_id, since);
    const totalCount = recentActions.reduce((total, action) => {
      return total + action.count;
    }, 0);

    if (totalCount >= trigger.amount) {
      return {
        type: "textspam",
        actionType: recentActionType,
        channelId: trigger.per_channel ? msg.channel_id : null,
        messageInfos: recentActions.map(action => (action as TextRecentAction).messageInfo),
        userId: msg.user_id,
      };
    }

    return null;
  }

  protected async matchMultipleTextTypesOnMessage<T>(
    trigger: TextTriggerWithMultipleMatchTypes,
    msg: SavedMessage,
    matchFn: (str: string) => T | Promise<T> | null,
  ): Promise<Partial<TextTriggerMatchResult<T>>> {
    const messageInfo: MessageInfo = { channelId: msg.channel_id, messageId: msg.id };
    const member = this.guild.members.get(msg.user_id);

    if (trigger.match_messages) {
      const str = msg.data.content;
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "message", str, userId: msg.user_id, messageInfo, matchedValue: matchResult };
      }
    }

    if (trigger.match_embeds && msg.data.embeds && msg.data.embeds.length) {
      const str = JSON.stringify(msg.data.embeds[0]);
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "embed", str, userId: msg.user_id, messageInfo, matchedValue: matchResult };
      }
    }

    if (trigger.match_visible_names) {
      const str = member.nick || msg.data.author.username;
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "visiblename", str, userId: msg.user_id, matchedValue: matchResult };
      }
    }

    if (trigger.match_usernames) {
      const str = `${msg.data.author.username}#${msg.data.author.discriminator}`;
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "username", str, userId: msg.user_id, matchedValue: matchResult };
      }
    }

    if (trigger.match_nicknames && member.nick) {
      const str = member.nick;
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "nickname", str, userId: msg.user_id, matchedValue: matchResult };
      }
    }

    // type 4 = custom status
    if (trigger.match_custom_status && member.game && member.game.type === 4) {
      const str = member.game.state;
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "customstatus", str, userId: msg.user_id, matchedValue: matchResult };
      }
    }

    return null;
  }

  protected async matchMultipleTextTypesOnMember<T>(
    trigger: TextTriggerWithMultipleMatchTypes,
    member: Member,
    matchFn: (str: string) => T | Promise<T> | null,
  ): Promise<Partial<TextTriggerMatchResult<T>>> {
    if (trigger.match_usernames) {
      const str = `${member.user.username}#${member.user.discriminator}`;
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "username", str, userId: member.id, matchedValue: matchResult };
      }
    }

    if (trigger.match_nicknames && member.nick) {
      const str = member.nick;
      const matchResult = await matchFn(str);
      if (matchResult) {
        return { type: "nickname", str, userId: member.id, matchedValue: matchResult };
      }
    }

    return null;
  }

  /**
   * Returns whether the triggers in the rule match the given message
   */
  protected async matchRuleToMessage(
    rule: TRule,
    msg: SavedMessage,
  ): Promise<TextTriggerMatchResult | TextSpamTriggerMatchResult> {
    if (!rule.enabled) return;

    for (const trigger of rule.triggers) {
      if (trigger.match_words) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_words, msg, str => {
          return this.evaluateMatchWordsTrigger(trigger.match_words, str);
        });
        if (match) return { ...match, trigger: "match_words" } as TextTriggerMatchResult;
      }

      if (trigger.match_regex) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_regex, msg, str => {
          return this.evaluateMatchRegexTrigger(trigger.match_regex, str);
        });
        if (match) return { ...match, trigger: "match_regex" } as TextTriggerMatchResult;
      }

      if (trigger.match_invites) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_invites, msg, str => {
          return this.evaluateMatchInvitesTrigger(trigger.match_invites, str);
        });
        if (match) return { ...match, trigger: "match_invites" } as TextTriggerMatchResult;
      }

      if (trigger.match_links) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_links, msg, str => {
          return this.evaluateMatchLinksTrigger(trigger.match_links, str);
        });
        if (match) return { ...match, trigger: "match_links" } as TextTriggerMatchResult;
      }

      if (trigger.message_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Message, trigger.message_spam, msg);
        if (match) return { ...match, trigger: "message_spam" } as TextSpamTriggerMatchResult;
      }

      if (trigger.mention_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Mention, trigger.mention_spam, msg);
        if (match) return { ...match, trigger: "mention_spam" } as TextSpamTriggerMatchResult;
      }

      if (trigger.link_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Link, trigger.link_spam, msg);
        if (match) return { ...match, trigger: "link_spam" } as TextSpamTriggerMatchResult;
      }

      if (trigger.attachment_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Attachment, trigger.attachment_spam, msg);
        if (match) return { ...match, trigger: "attachment_spam" } as TextSpamTriggerMatchResult;
      }

      if (trigger.emoji_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Emoji, trigger.emoji_spam, msg);
        if (match) return { ...match, trigger: "emoji_spam" } as TextSpamTriggerMatchResult;
      }

      if (trigger.line_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Line, trigger.line_spam, msg);
        if (match) return { ...match, trigger: "line_spam" } as TextSpamTriggerMatchResult;
      }

      if (trigger.character_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Character, trigger.character_spam, msg);
        if (match) return { ...match, trigger: "character_spam" } as TextSpamTriggerMatchResult;
      }
    }

    return null;
  }

  protected async addRecentMessageAction(action: TextRecentAction) {
    const gracePeriodKey = `${action.identifier}-${action.type}`;
    if (this.spamGracePeriods.has(gracePeriodKey)) {
      // If we're on spam detection grace period, just delete the message
      if (!this.recentlyDeletedMessages.includes(action.messageInfo.messageId)) {
        this.bot.deleteMessage(action.messageInfo.channelId, action.messageInfo.messageId);

        this.recentlyDeletedMessages.push(action.messageInfo.messageId);
        if (this.recentlyDeletedMessages.length > MAX_RECENTLY_DELETED_MESSAGES) {
          this.recentlyDeletedMessages.splice(0, this.recentlyDeletedMessages.length - MAX_RECENTLY_DELETED_MESSAGES);
        }
      }

      return;
    }

    this.recentActions.push({
      ...action,
      expiresAt: Date.now() + RECENT_ACTION_EXPIRY_TIME,
    });
  }

  /**
   * Logs recent actions for spam detection purposes
   */
  protected async logRecentActionsForMessage(msg: SavedMessage) {
    const timestamp = moment.utc(msg.posted_at).valueOf();
    const globalIdentifier = msg.user_id;
    const perChannelIdentifier = `${msg.channel_id}-${msg.user_id}`;
    const messageInfo: MessageInfo = { channelId: msg.channel_id, messageId: msg.id };

    this.addRecentMessageAction({
      type: RecentActionType.Message,
      identifier: globalIdentifier,
      timestamp,
      count: 1,
      messageInfo,
    });
    this.addRecentMessageAction({
      type: RecentActionType.Message,
      identifier: perChannelIdentifier,
      timestamp,
      count: 1,
      messageInfo,
    });

    const mentionCount =
      getUserMentions(msg.data.content || "").length + getRoleMentions(msg.data.content || "").length;
    if (mentionCount) {
      this.addRecentMessageAction({
        type: RecentActionType.Mention,
        identifier: globalIdentifier,
        timestamp,
        count: mentionCount,
        messageInfo,
      });
      this.addRecentMessageAction({
        type: RecentActionType.Mention,
        identifier: perChannelIdentifier,
        timestamp,
        count: mentionCount,
        messageInfo,
      });
    }

    const linkCount = getUrlsInString(msg.data.content || "").length;
    if (linkCount) {
      this.addRecentMessageAction({
        type: RecentActionType.Link,
        identifier: globalIdentifier,
        timestamp,
        count: linkCount,
        messageInfo,
      });
      this.addRecentMessageAction({
        type: RecentActionType.Link,
        identifier: perChannelIdentifier,
        timestamp,
        count: linkCount,
        messageInfo,
      });
    }

    const attachmentCount = msg.data.attachments && msg.data.attachments.length;
    if (attachmentCount) {
      this.addRecentMessageAction({
        type: RecentActionType.Attachment,
        identifier: globalIdentifier,
        timestamp,
        count: attachmentCount,
        messageInfo,
      });
      this.addRecentMessageAction({
        type: RecentActionType.Attachment,
        identifier: perChannelIdentifier,
        timestamp,
        count: attachmentCount,
        messageInfo,
      });
    }

    const emojiCount = getEmojiInString(msg.data.content || "").length;
    if (emojiCount) {
      this.addRecentMessageAction({
        type: RecentActionType.Emoji,
        identifier: globalIdentifier,
        timestamp,
        count: emojiCount,
        messageInfo,
      });
      this.addRecentMessageAction({
        type: RecentActionType.Emoji,
        identifier: perChannelIdentifier,
        timestamp,
        count: emojiCount,
        messageInfo,
      });
    }

    // + 1 is for the first line of the message (which doesn't have a line break)
    const lineCount = msg.data.content ? (msg.data.content.match(/\n/g) || []).length + 1 : 0;
    if (lineCount) {
      this.addRecentMessageAction({
        type: RecentActionType.Line,
        identifier: globalIdentifier,
        timestamp,
        count: lineCount,
        messageInfo,
      });
      this.addRecentMessageAction({
        type: RecentActionType.Line,
        identifier: perChannelIdentifier,
        timestamp,
        count: lineCount,
        messageInfo,
      });
    }

    const characterCount = [...(msg.data.content || "")].length;
    if (characterCount) {
      this.addRecentMessageAction({
        type: RecentActionType.Character,
        identifier: globalIdentifier,
        timestamp,
        count: characterCount,
        messageInfo,
      });
      this.addRecentMessageAction({
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

  protected async activateGracePeriod(matchResult: TextSpamTriggerMatchResult) {
    const expiresAt = Date.now() + SPAM_GRACE_PERIOD_LENGTH;

    // Global identifier
    this.spamGracePeriods.set(`${matchResult.userId}-${matchResult.actionType}`, { expiresAt, deletedMessages: [] });
    // Per-channel identifier
    this.spamGracePeriods.set(`${matchResult.channelId}-${matchResult.userId}-${matchResult.actionType}`, {
      expiresAt,
      deletedMessages: [],
    });
  }

  protected async clearExpiredGracePeriods() {
    for (const [key, info] of this.spamGracePeriods.entries()) {
      if (info.expiresAt <= Date.now()) {
        this.spamGracePeriods.delete(key);
      }
    }
  }

  protected async clearOldRecentActions() {
    this.recentActions = this.recentActions.filter(info => {
      return info.expiresAt <= Date.now();
    });
  }

  protected async clearExpiredRecentNicknameChanges() {
    for (const [key, info] of this.recentNicknameChanges.entries()) {
      if (info.expiresAt <= Date.now()) {
        this.recentNicknameChanges.delete(key);
      }
    }
  }

  protected async clearSpecificRecentActions(type: RecentActionType, identifier: string) {
    this.recentActions = this.recentActions.filter(info => {
      return !(info.type === type && info.identifier === identifier);
    });
  }

  /**
   * Apply the actions of the specified rule on the matched message/member
   */
  protected async applyActionsOnMatch(rule: TRule, matchResult: AnyTriggerMatchResult) {
    if (rule.cooldown && this.checkAndUpdateCooldown(rule, matchResult)) {
      return;
    }

    const matchSummary = this.getMatchSummary(matchResult);

    let caseExtraNote = `Matched automod rule "${rule.name}"`;
    if (matchSummary) {
      caseExtraNote += `\n${matchSummary}`;
    }

    const actionsTaken = [];

    // Actions
    if (rule.actions.clean) {
      const messagesToDelete: Array<{ channelId: string; messageId: string }> = [];

      if (matchResult.type === "message" || matchResult.type === "embed") {
        messagesToDelete.push(matchResult.messageInfo);
      } else if (matchResult.type === "textspam" || matchResult.type === "raidspam") {
        messagesToDelete.push(...matchResult.messageInfos);
      }

      for (const { channelId, messageId } of messagesToDelete) {
        await this.bot.deleteMessage(channelId, messageId).catch(noop);
      }

      actionsTaken.push("clean");
    }

    if (rule.actions.warn) {
      const reason = rule.actions.warn.reason || "Warned automatically";

      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        const member = await this.getMember(matchResult.userId);
        if (member) {
          await this.getModActions().warnMember(member, reason, caseArgs);
        }
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          const member = await this.getMember(userId);
          if (member) {
            await this.getModActions().warnMember(member, reason, caseArgs);
          }
        }
      }

      actionsTaken.push("warn");
    }

    if (rule.actions.mute) {
      const duration = rule.actions.mute.duration ? convertDelayStringToMS(rule.actions.mute.duration) : null;
      const reason = rule.actions.mute.reason || "Muted automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        await this.mutes.muteUser(matchResult.userId, duration, reason, caseArgs);
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          await this.mutes.muteUser(userId, duration, reason, caseArgs);
        }
      }

      actionsTaken.push("mute");
    }

    if (rule.actions.kick) {
      const reason = rule.actions.kick.reason || "Kicked automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        const member = await this.getMember(matchResult.userId);
        if (member) {
          await this.getModActions().kickMember(member, reason, caseArgs);
        }
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          const member = await this.getMember(userId);
          if (member) {
            await this.getModActions().kickMember(member, reason, caseArgs);
          }
        }
      }

      actionsTaken.push("kick");
    }

    if (rule.actions.ban) {
      const reason = rule.actions.ban.reason || "Banned automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };

      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "textspam") {
        await this.getModActions().banUserId(matchResult.userId, reason, caseArgs);
      } else if (matchResult.type === "raidspam") {
        for (const userId of matchResult.userIds) {
          await this.getModActions().banUserId(userId, reason, caseArgs);
        }
      }

      actionsTaken.push("ban");
    }

    if (rule.actions.change_nickname) {
      const userIdsToChange = matchResult.type === "raidspam" ? matchResult.userIds : [matchResult.userId];

      for (const userId of userIdsToChange) {
        if (this.recentNicknameChanges.has(userId)) continue;
        this.guild
          .editMember(userId, {
            nick: rule.actions.change_nickname.name,
          })
          .catch(() => {
            this.getLogs().log(LogType.BOT_ALERT, {
              body: `Failed to change the nickname of \`${userId}\``,
            });
          });
        this.recentNicknameChanges.set(userId, { expiresAt: RECENT_NICKNAME_CHANGE_EXPIRY_TIME });
      }

      actionsTaken.push("nickname");
    }

    if (rule.actions.add_roles) {
      const userIdsToChange = matchResult.type === "raidspam" ? matchResult.userIds : [matchResult.userId];
      for (const userId of userIdsToChange) {
        const member = await this.getMember(userId);
        if (!member) continue;

        const memberRoles = new Set(member.roles);
        for (const roleId of rule.actions.add_roles) {
          memberRoles.add(roleId);
        }

        if (memberRoles.size === member.roles.length) {
          // No role changes
          continue;
        }

        const rolesArr = Array.from(memberRoles.values());
        await member.edit({
          roles: rolesArr,
        });
        member.roles = rolesArr; // Make sure we know of the new roles internally as well
      }

      actionsTaken.push("add roles");
    }

    if (rule.actions.remove_roles) {
      const userIdsToChange = matchResult.type === "raidspam" ? matchResult.userIds : [matchResult.userId];
      for (const userId of userIdsToChange) {
        const member = await this.getMember(userId);
        if (!member) continue;

        const memberRoles = new Set(member.roles);
        for (const roleId of rule.actions.remove_roles) {
          memberRoles.delete(roleId);
        }

        if (memberRoles.size === member.roles.length) {
          // No role changes
          continue;
        }

        const rolesArr = Array.from(memberRoles.values());
        await member.edit({
          roles: rolesArr,
        });
        member.roles = rolesArr; // Make sure we know of the new roles internally as well
      }

      actionsTaken.push("remove roles");
    }

    // Don't wait for the rest before continuing to other automod items in the queue
    (async () => {
      const user = matchResult.type !== "raidspam" ? this.getUser(matchResult.userId) : new UnknownUser();
      const users = matchResult.type === "raidspam" ? matchResult.userIds.map(id => this.getUser(id)) : [];
      const safeUser = stripObjectToScalars(user);
      const safeUsers = users.map(u => stripObjectToScalars(u));

      const logData = {
        rule: rule.name,
        user: safeUser,
        users: safeUsers,
        actionsTaken: actionsTaken.length ? actionsTaken.join(", ") : "<none>",
        matchSummary,
      };
      const logMessage = this.getLogs().getLogMessage(LogType.AUTOMOD_ACTION, logData);

      if (rule.actions.alert) {
        const channel = this.guild.channels.get(rule.actions.alert.channel);
        if (channel && channel instanceof TextChannel) {
          const text = rule.actions.alert.text;
          const rendered = await renderTemplate(rule.actions.alert.text, {
            rule: rule.name,
            user: safeUser,
            users: safeUsers,
            text,
            matchSummary,
            logMessage,
          });
          channel.createMessage(rendered);
          actionsTaken.push("alert");
        } else {
          this.getLogs().log(LogType.BOT_ALERT, {
            body: `Invalid channel id \`${rule.actions.alert.channel}\` for alert action in automod rule **${rule.name}**`,
          });
        }
      }

      if (rule.actions.log) {
        this.getLogs().log(LogType.AUTOMOD_ACTION, logData);
      }
    })();
  }

  /**
   * Check if the rule's on cooldown and bump its usage count towards the cooldown up
   * @return Whether the rule's on cooldown
   */
  protected checkAndUpdateCooldown(rule: TRule, matchResult: AnyTriggerMatchResult): boolean {
    let cooldownKey = rule.name + "-";

    if (matchResult.type === "textspam") {
      cooldownKey += matchResult.channelId ? `${matchResult.channelId}-${matchResult.userId}` : matchResult.userId;
    } else if (matchResult.type === "message" || matchResult.type === "embed") {
      cooldownKey += matchResult.userId;
    } else if (
      matchResult.type === "username" ||
      matchResult.type === "nickname" ||
      matchResult.type === "visiblename" ||
      matchResult.type === "customstatus"
    ) {
      cooldownKey += matchResult.userId;
    } else if (matchResult.type === "otherspam") {
      cooldownKey += matchResult.userId;
    } else {
      cooldownKey = null;
    }

    if (cooldownKey) {
      if (this.cooldownManager.isOnCooldown(cooldownKey)) {
        return true;
      }

      const cooldownTime = convertDelayStringToMS(rule.cooldown, "s");
      if (cooldownTime) {
        this.cooldownManager.setCooldown(cooldownKey, cooldownTime);
      }
    }

    return false;
  }

  /**
   * Returns a text summary for the match result for use in logs/alerts
   */
  protected async getMatchSummary(matchResult: AnyTriggerMatchResult): Promise<string> {
    if (matchResult.type === "message" || matchResult.type === "embed") {
      const message = await this.savedMessages.find(matchResult.messageInfo.messageId);
      const channel = this.guild.channels.get(matchResult.messageInfo.channelId);
      const channelMention = channel ? verboseChannelMention(channel) : `\`#${message.channel_id}\``;

      return trimPluginDescription(`
        Matched ${this.getMatchedValueText(matchResult)} in message in ${channelMention}:
        ${messageSummary(message)}
      `);
    } else if (matchResult.type === "textspam" || matchResult.type === "raidspam") {
      const savedMessages = await this.savedMessages.getMultiple(matchResult.messageInfos.map(i => i.messageId));
      const archiveId = await this.archives.createFromSavedMessages(savedMessages, this.guild);
      const baseUrl = this.knub.getGlobalConfig().url;
      const archiveUrl = this.archives.getUrl(baseUrl, archiveId);

      return trimPluginDescription(`
        Matched spam: ${disableLinkPreviews(archiveUrl)}
      `);
    } else if (matchResult.type === "username") {
      return `Matched ${this.getMatchedValueText(matchResult)} in username: ${matchResult.str}`;
    } else if (matchResult.type === "nickname") {
      return `Matched ${this.getMatchedValueText(matchResult)} in nickname: ${matchResult.str}`;
    } else if (matchResult.type === "visiblename") {
      return `Matched ${this.getMatchedValueText(matchResult)} in visible name: ${matchResult.str}`;
    } else if (matchResult.type === "customstatus") {
      return `Matched ${this.getMatchedValueText(matchResult)} in custom status: ${matchResult.str}`;
    }
  }

  /**
   * Returns a formatted version of the matched value (word, regex pattern, link, etc.) for use in the match summary
   */
  protected getMatchedValueText(matchResult: TextTriggerMatchResult): string | null {
    if (matchResult.trigger === "match_words") {
      return `word \`${disableInlineCode(matchResult.matchedValue)}\``;
    } else if (matchResult.trigger === "match_regex") {
      return `regex \`${disableInlineCode(matchResult.matchedValue)}\``;
    } else if (matchResult.trigger === "match_invites") {
      return `invite code \`${disableInlineCode(matchResult.matchedValue)}\``;
    } else if (matchResult.trigger === "match_links") {
      return `link \`${disableInlineCode(matchResult.matchedValue)}\``;
    }

    return typeof matchResult.matchedValue === "string" ? `\`${disableInlineCode(matchResult.matchedValue)}\`` : null;
  }

  /**
   * Run automod actions on new messages
   */
  protected onMessageCreate(msg: SavedMessage) {
    if (msg.is_bot) return;

    this.automodQueue.add(async () => {
      if (this.unloaded) return;

      await this.logRecentActionsForMessage(msg);

      const member = this.guild.members.get(msg.user_id);
      const config = this.getMatchingConfig({
        member,
        userId: msg.user_id,
        channelId: msg.channel_id,
      });
      for (const [name, rule] of Object.entries(config.rules)) {
        const matchResult = await this.matchRuleToMessage(rule, msg);
        if (matchResult) {
          await this.applyActionsOnMatch(rule, matchResult);
          break; // Don't apply multiple rules to the same message
        }
      }
    });
  }
}
