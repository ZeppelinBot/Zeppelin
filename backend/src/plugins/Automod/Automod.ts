import { trimPluginDescription, ZeppelinPlugin } from "../ZeppelinPlugin";
import * as t from "io-ts";
import {
  convertDelayStringToMS,
  disableInlineCode,
  disableLinkPreviews,
  disableUserNotificationStrings,
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
  UserNotificationMethod,
  verboseChannelMention,
} from "../../utils";
import { configUtils, CooldownManager, decorators as d, IPluginOptions, logger } from "knub";
import { Member, Message, TextChannel, User } from "eris";
import escapeStringRegexp from "escape-string-regexp";
import { SimpleCache } from "../../SimpleCache";
import { Queue } from "../../Queue";
import { ModActionsPlugin } from "../ModActions";
import { MutesPlugin } from "../Mutes";
import { LogsPlugin } from "../Logs";
import { LogType } from "../../data/LogType";
import { GuildSavedMessages } from "../../data/GuildSavedMessages";
import { GuildArchives } from "../../data/GuildArchives";
import { GuildLogs } from "../../data/GuildLogs";
import { SavedMessage } from "../../data/entities/SavedMessage";
import moment from "moment-timezone";
import { renderTemplate } from "../../templateFormatter";
import { transliterate } from "transliteration";
import { IMatchParams } from "knub/dist/configUtils";
import { GuildAntiraidLevels } from "../../data/GuildAntiraidLevels";
import {
  AnyTriggerMatchResult,
  BaseTextSpamTrigger,
  MessageInfo,
  OtherRecentAction,
  OtherSpamTriggerMatchResult,
  OtherTriggerMatchResult,
  RecentAction,
  RecentActionType,
  RecentSpam,
  Rule,
  TBaseSpamTrigger,
  TBaseTextSpamTrigger,
  TextRecentAction,
  TextSpamTriggerMatchResult,
  TextTriggerMatchResult,
  TextTriggerWithMultipleMatchTypes,
  TMatchInvitesTrigger,
  TMatchLinksTrigger,
  TMatchRegexTrigger,
  TMatchWordsTrigger,
  TMemberJoinTrigger,
  TRule,
  TMatchAttachmentTypeTrigger,
} from "./types";
import { pluginInfo } from "./info";
import { ERRORS, RecoverablePluginError } from "../../RecoverablePluginError";
import Timeout = NodeJS.Timeout;
import { StrictValidationError } from "src/validatorUtils";

const unactioned = (action: TextRecentAction | OtherRecentAction) => !action.actioned;

/**
 * DEFAULTS
 */

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

const defaultMatchInvitesTrigger: Partial<TMatchInvitesTrigger> = {
  allow_group_dm_invites: false,
  match_messages: true,
  match_embeds: true,
  match_visible_names: false,
  match_usernames: false,
  match_nicknames: false,
  match_custom_status: false,
};

const defaultMatchLinksTrigger: Partial<TMatchLinksTrigger> = {
  include_subdomains: true,
  match_messages: true,
  match_embeds: true,
  match_visible_names: false,
  match_usernames: false,
  match_nicknames: false,
  match_custom_status: false,
};

const defaultMatchAttachmentTypeTrigger: Partial<TMatchAttachmentTypeTrigger> = {
  filetype_blacklist: [],
  blacklist_enabled: false,
  filetype_whitelist: [],
  whitelist_enabled: false,
  match_messages: true,
  match_embeds: true,
  match_visible_names: false,
  match_usernames: false,
  match_nicknames: false,
  match_custom_status: false,
};

const defaultTextSpamTrigger: Partial<t.TypeOf<typeof BaseTextSpamTrigger>> = {
  per_channel: true,
};

const defaultMemberJoinTrigger: Partial<TMemberJoinTrigger> = {
  only_new: false,
  new_threshold: "1h",
};

const defaultTriggers = {
  match_words: defaultMatchWordsTrigger,
  match_regex: defaultMatchRegexTrigger,
  match_invites: defaultMatchInvitesTrigger,
  match_links: defaultMatchLinksTrigger,
  match_attachment_type: defaultMatchAttachmentTypeTrigger,
  message_spam: defaultTextSpamTrigger,
  mention_spam: defaultTextSpamTrigger,
  link_spam: defaultTextSpamTrigger,
  attachment_spam: defaultTextSpamTrigger,
  emoji_spam: defaultTextSpamTrigger,
  line_spam: defaultTextSpamTrigger,
  character_spam: defaultTextSpamTrigger,
  member_join: defaultMemberJoinTrigger,
};

/**
 * CONFIG
 */

const ConfigSchema = t.type({
  rules: t.record(t.string, Rule),
  antiraid_levels: t.array(t.string),
  can_set_antiraid: t.boolean,
  can_view_antiraid: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

const PartialConfigSchema = tDeepPartial(ConfigSchema);

interface ICustomOverrides {
  antiraid_level: string;
}

/**
 * MISC
 */

const RECENT_SPAM_EXPIRY_TIME = 30 * SECONDS;
const RECENT_ACTION_EXPIRY_TIME = 5 * MINUTES;
const RECENT_NICKNAME_CHANGE_EXPIRY_TIME = 5 * MINUTES;

const inviteCache = new SimpleCache(10 * MINUTES);

const RAID_SPAM_IDENTIFIER = "raid";

/**
 * General plugin flow:
 *
 * - Message based triggers:
 * 	 1. matchRuleToMessage()
 * 	 2. if match -> applyActionsOnMatch()
 * 	 3. if spam -> clearTextSpamRecentActions()
 *
 * - Non-message based non-spam triggers:
 * 	 1. bespoke match function
 * 	 2. if match -> applyActionsOnMatch()
 *
 * - Non-message based spam triggers:
 * 	 1. matchOtherSpamInRule()
 * 	 2. if match -> applyActionsOnMatch()
 * 	 3.          -> clearOtherSpamRecentActions()
 *
 * To log actions for spam detection, logRecentActionsForMessage() is called for each message, and several other events
 * call addRecentAction() directly. These are then checked by matchRuleToMessage() and matchOtherSpamInRule() to detect
 * spam.
 */
export class AutomodPlugin extends ZeppelinPlugin<TConfigSchema, ICustomOverrides> {
  public static pluginName = "automod";
  public static configSchema = ConfigSchema;
  public static dependencies = ["mod_actions", "mutes", "logs"];

  public static pluginInfo = pluginInfo;

  protected unloaded = false;

  // Handle automod checks/actions in a queue so we don't get overlap on the same user
  protected automodQueue: Queue;

  // Recent actions are used to detect spam triggers
  protected recentActions: RecentAction[];
  protected recentActionClearInterval: Timeout;

  // After a spam trigger is tripped and the rule's action carried out, a unique identifier is placed here so further
  // spam (either messages that were sent before the bot managed to mute the user or, with global spam, other users
  // continuing to spam) is "included" in the same match and doesn't generate duplicate cases or logs.
  // Key: rule_name-match_identifier
  protected recentSpam: Map<string, RecentSpam>;
  protected recentSpamClearInterval: Timeout;

  protected recentNicknameChanges: Map<string, { expiresAt: number }>;
  protected recentNicknameChangesClearInterval: Timeout;

  protected cooldownManager: CooldownManager;

  protected onMessageCreateFn;

  protected savedMessages: GuildSavedMessages;
  protected archives: GuildArchives;
  protected guildLogs: GuildLogs;
  protected antiraidLevels: GuildAntiraidLevels;

  protected loadedAntiraidLevel: boolean;
  protected cachedAntiraidLevel: string | null;

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

            if (trigger.match_attachment_type) {
              const white = trigger.match_attachment_type.whitelist_enabled;
              const black = trigger.match_attachment_type.blacklist_enabled;

              if (white && black) {
                throw new StrictValidationError([
                  `Cannot have both blacklist and whitelist enabled at rule <${rule.name}/match_attachment_type>`,
                ]);
              } else if (!white && !black) {
                throw new StrictValidationError([
                  `Must have either blacklist or whitelist enabled at rule <${rule.name}/match_attachment_type>`,
                ]);
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

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema, ICustomOverrides> {
    return {
      config: {
        rules: {},
        antiraid_levels: ["low", "medium", "high"],
        can_set_antiraid: false,
        can_view_antiraid: false,
      },
      overrides: [
        {
          level: ">=50",
          config: {
            can_view_antiraid: true,
          },
        },
        {
          level: ">=100",
          config: {
            can_set_antiraid: true,
          },
        },
      ],
    };
  }

  protected matchCustomOverrideCriteria(criteria: ICustomOverrides, matchParams: IMatchParams) {
    return criteria?.antiraid_level && criteria.antiraid_level === this.cachedAntiraidLevel;
  }

  protected async onLoad() {
    this.automodQueue = new Queue();

    this.recentActions = [];
    this.recentActionClearInterval = setInterval(() => this.clearOldRecentActions(), 1 * MINUTES);

    this.recentSpam = new Map();
    this.recentSpamClearInterval = setInterval(() => this.clearExpiredRecentSpam(), 1 * SECONDS);

    this.recentNicknameChanges = new Map();
    this.recentNicknameChangesClearInterval = setInterval(() => this.clearExpiredRecentNicknameChanges(), 30 * SECONDS);

    this.cooldownManager = new CooldownManager();

    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.archives = GuildArchives.getGuildInstance(this.guildId);
    this.guildLogs = new GuildLogs(this.guildId);
    this.antiraidLevels = GuildAntiraidLevels.getGuildInstance(this.guildId);

    this.cachedAntiraidLevel = await this.antiraidLevels.get();

    this.onMessageCreateFn = msg => this.onMessageCreate(msg);
    this.savedMessages.events.on("create", this.onMessageCreateFn);
  }

  protected getModActions(): ModActionsPlugin {
    return this.getPlugin("mod_actions");
  }

  protected getLogs(): LogsPlugin {
    return this.getPlugin("logs");
  }

  protected getMutes(): MutesPlugin {
    return this.getPlugin("mutes");
  }

  protected onUnload() {
    this.unloaded = true;
    this.savedMessages.events.off("create", this.onMessageCreateFn);
    clearInterval(this.recentActionClearInterval);
    clearInterval(this.recentSpamClearInterval);
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

  protected evaluateMatchAttachmentTypeTrigger(trigger: TMatchAttachmentTypeTrigger, msg: SavedMessage): null | string {
    if (!msg.data.attachments) return null;
    const attachments: any[] = msg.data.attachments;

    for (const attachment of attachments) {
      const attachment_type = attachment.filename.split(`.`).pop();
      if (trigger.blacklist_enabled && trigger.filetype_blacklist.includes(attachment_type)) {
        return `${attachment_type} - blacklisted`;
      }
      if (trigger.whitelist_enabled && !trigger.filetype_whitelist.includes(attachment_type)) {
        return `${attachment_type} - not whitelisted`;
      }
    }

    return null;
  }

  protected matchTextSpamTrigger(
    recentActionType: RecentActionType,
    trigger: TBaseTextSpamTrigger,
    msg: SavedMessage,
  ): Omit<TextSpamTriggerMatchResult, "trigger" | "rule"> {
    const since = moment.utc(msg.posted_at).valueOf() - convertDelayStringToMS(trigger.within);
    const identifier = trigger.per_channel ? `${msg.channel_id}-${msg.user_id}` : msg.user_id;
    const recentActions = this.getMatchingRecentActions(recentActionType, identifier, since);
    const totalCount = recentActions.reduce((total, action) => {
      return total + action.count;
    }, 0);

    if (totalCount >= trigger.amount) {
      return {
        type: "textspam",
        actionType: recentActionType,
        recentActions: recentActions as TextRecentAction[],
        identifier,
      };
    }

    return null;
  }

  protected matchOtherSpamTrigger(
    recentActionType: RecentActionType,
    trigger: TBaseSpamTrigger,
    identifier: string | null,
  ): Omit<OtherSpamTriggerMatchResult, "trigger" | "rule"> {
    const since = moment.utc().valueOf() - convertDelayStringToMS(trigger.within);
    const recentActions = this.getMatchingRecentActions(recentActionType, identifier, since) as OtherRecentAction[];
    const totalCount = recentActions.reduce((total, action) => {
      return total + action.count;
    }, 0);

    if (totalCount >= trigger.amount) {
      return {
        type: "otherspam",
        actionType: recentActionType,
        recentActions,
        identifier,
      };
    }

    return null;
  }

  protected async matchMultipleTextTypesOnMessage<T>(
    trigger: TextTriggerWithMultipleMatchTypes,
    msg: SavedMessage,
    matchFn: (str: string) => T | Promise<T> | null,
  ): Promise<Partial<TextTriggerMatchResult<T>>> {
    const messageInfo: MessageInfo = { channelId: msg.channel_id, messageId: msg.id, userId: msg.user_id };
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

      if (trigger.match_attachment_type) {
        const match = await this.matchMultipleTextTypesOnMessage(trigger.match_attachment_type, msg, str => {
          return this.evaluateMatchAttachmentTypeTrigger(trigger.match_attachment_type, msg);
        });
        if (match) return { ...match, trigger: "match_attachment_type" } as TextTriggerMatchResult;
      }

      if (trigger.message_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Message, trigger.message_spam, msg);
        if (match) return { ...match, rule, trigger: "message_spam" };
      }

      if (trigger.mention_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Mention, trigger.mention_spam, msg);
        if (match) return { ...match, rule, trigger: "mention_spam" };
      }

      if (trigger.link_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Link, trigger.link_spam, msg);
        if (match) return { ...match, rule, trigger: "link_spam" };
      }

      if (trigger.attachment_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Attachment, trigger.attachment_spam, msg);
        if (match) return { ...match, rule, trigger: "attachment_spam" };
      }

      if (trigger.emoji_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Emoji, trigger.emoji_spam, msg);
        if (match) return { ...match, rule, trigger: "emoji_spam" };
      }

      if (trigger.line_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Line, trigger.line_spam, msg);
        if (match) return { ...match, rule, trigger: "line_spam" };
      }

      if (trigger.character_spam) {
        const match = this.matchTextSpamTrigger(RecentActionType.Character, trigger.character_spam, msg);
        if (match) return { ...match, rule, trigger: "character_spam" };
      }
    }

    return null;
  }

  protected async matchOtherSpamInRule(rule: TRule, userId: string): Promise<OtherSpamTriggerMatchResult> {
    if (!rule.enabled) return;

    for (const trigger of rule.triggers) {
      if (trigger.member_join_spam) {
        const match = this.matchOtherSpamTrigger(RecentActionType.MemberJoin, trigger.member_join_spam, null);
        if (match) return { ...match, rule, trigger: "member_join_spam" };
      }
    }

    return null;
  }

  protected async matchMemberJoinTriggerInRule(rule: TRule, member: Member): Promise<OtherTriggerMatchResult> {
    if (!rule.enabled) return;

    const result: OtherTriggerMatchResult = { trigger: "member_join", type: "other", userId: member.id };

    for (const trigger of rule.triggers) {
      if (trigger.member_join) {
        if (trigger.member_join.only_new) {
          const threshold = Date.now() - convertDelayStringToMS(trigger.member_join.new_threshold);
          if (member.createdAt >= threshold) {
            return result;
          }
        } else {
          return result;
        }
      }
    }

    return null;
  }

  protected async addRecentMessageAction(action: TextRecentAction) {
    this.recentActions.push({
      ...action,
      expiresAt: Date.now() + RECENT_ACTION_EXPIRY_TIME,
    });
  }

  protected async addRecentAction(action: OtherRecentAction) {
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
    const messageInfo: MessageInfo = { channelId: msg.channel_id, messageId: msg.id, userId: msg.user_id };

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

  protected getMatchingRecentActions(type: RecentActionType, identifier: string | null, since: number) {
    return this.recentActions.filter(action => {
      return action.type === type && (!identifier || action.identifier === identifier) && action.timestamp >= since;
    });
  }

  protected async clearExpiredRecentSpam() {
    for (const [key, info] of this.recentSpam.entries()) {
      if (info.expiresAt <= Date.now()) {
        this.recentSpam.delete(key);
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

  protected readContactMethodsFromAction(action: {
    notify?: string;
    notifyChannel?: string;
  }): UserNotificationMethod[] | null {
    if (action.notify === "dm") {
      return [{ type: "dm" }];
    } else if (action.notify === "channel") {
      if (!action.notifyChannel) {
        throw new RecoverablePluginError(ERRORS.NO_USER_NOTIFICATION_CHANNEL);
      }

      const channel = this.guild.channels.get(action.notifyChannel);
      if (!(channel instanceof TextChannel)) {
        throw new RecoverablePluginError(ERRORS.INVALID_USER_NOTIFICATION_CHANNEL);
      }

      return [{ type: "channel", channel }];
    } else if (action.notify && disableUserNotificationStrings.includes(action.notify)) {
      return [];
    }

    return null;
  }

  /**
   * Apply the actions of the specified rule on the matched message/member
   */
  protected async applyActionsOnMatch(rule: TRule, matchResult: AnyTriggerMatchResult) {
    if (rule.cooldown && this.checkAndUpdateCooldown(rule, matchResult)) {
      return;
    }

    const actionsTaken = [];

    let recentSpamKey: string = null;
    let recentSpam: RecentSpam = null;
    let spamUserIdsToAction: string[] = [];

    if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
      recentSpamKey = `${rule.name}-${matchResult.identifier}`;
      recentSpam = this.recentSpam.get(recentSpamKey);

      if (matchResult.type === "textspam") {
        spamUserIdsToAction = matchResult.recentActions.map(action => action.messageInfo.userId);
      } else if (matchResult.type === "otherspam") {
        spamUserIdsToAction = matchResult.recentActions.map(action => action.userId);
      }

      spamUserIdsToAction = Array.from(new Set(spamUserIdsToAction)).filter(id => !recentSpam?.actionedUsers.has(id));
    }

    let archiveId = recentSpam?.archiveId;
    if (matchResult.type === "textspam") {
      const messageInfos = matchResult.recentActions.filter(unactioned).map(a => a.messageInfo);
      if (messageInfos.length) {
        const savedMessages = await this.savedMessages.getMultiple(messageInfos.map(info => info.messageId));

        if (archiveId) {
          await this.archives.addSavedMessagesToArchive(archiveId, savedMessages, this.guild);
        } else {
          archiveId = await this.archives.createFromSavedMessages(savedMessages, this.guild);
        }
      }
    }

    const matchSummary = await this.getMatchSummary(matchResult, archiveId);

    let caseExtraNote = `Matched automod rule "${rule.name}"`;
    if (matchSummary) {
      caseExtraNote += `\n${matchSummary}`;
    }

    if (rule.actions.clean) {
      const messagesToDelete: MessageInfo[] = [];

      if (matchResult.type === "message" || matchResult.type === "embed") {
        messagesToDelete.push(matchResult.messageInfo);
      } else if (matchResult.type === "textspam") {
        messagesToDelete.push(...matchResult.recentActions.filter(unactioned).map(a => a.messageInfo));
      }

      for (const { channelId, messageId } of messagesToDelete) {
        await this.guildLogs.ignoreLog(LogType.MESSAGE_DELETE, messageId);
        await this.bot.deleteMessage(channelId, messageId).catch(noop);
      }

      actionsTaken.push("clean");
    }

    if (rule.actions.warn) {
      const reason = rule.actions.warn.reason || "Warned automatically";
      const contactMethods = this.readContactMethodsFromAction(rule.actions.warn);

      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };

      let membersToWarn = [];
      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "other") {
        membersToWarn = [await this.getMember(matchResult.userId)];
      } else if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
        for (const id of spamUserIdsToAction) {
          membersToWarn.push(await this.getMember(id));
        }
      }

      if (membersToWarn.length) {
        for (const member of membersToWarn) {
          await this.getModActions().warnMember(member, reason, { contactMethods, caseArgs });
        }

        actionsTaken.push("warn");
      }
    }

    if (rule.actions.mute) {
      const duration = rule.actions.mute.duration ? convertDelayStringToMS(rule.actions.mute.duration) : null;
      const reason = rule.actions.mute.reason || "Muted automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };
      const contactMethods = this.readContactMethodsFromAction(rule.actions.mute);

      let userIdsToMute = [];
      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "other") {
        userIdsToMute = [matchResult.userId];
      } else if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
        userIdsToMute.push(...spamUserIdsToAction);
      }

      if (userIdsToMute.length) {
        for (const member of userIdsToMute) {
          await this.getMutes().muteUser(member.id, duration, reason, { contactMethods, caseArgs });
        }

        actionsTaken.push("mute");
      }
    }

    if (rule.actions.kick) {
      const reason = rule.actions.kick.reason || "Kicked automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };
      const contactMethods = this.readContactMethodsFromAction(rule.actions.kick);

      let membersToKick = [];
      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "other") {
        membersToKick = [await this.getMember(matchResult.userId)];
      } else if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
        for (const id of spamUserIdsToAction) {
          membersToKick.push(await this.getMember(id));
        }
      }

      if (membersToKick.length) {
        for (const member of membersToKick) {
          await this.getModActions().kickMember(member, reason, { contactMethods, caseArgs });
        }

        actionsTaken.push("kick");
      }
    }

    if (rule.actions.ban) {
      const reason = rule.actions.ban.reason || "Banned automatically";
      const caseArgs = {
        modId: this.bot.user.id,
        extraNotes: [caseExtraNote],
      };
      const contactMethods = this.readContactMethodsFromAction(rule.actions.ban);

      let userIdsToBan = [];
      if (matchResult.type === "message" || matchResult.type === "embed" || matchResult.type === "other") {
        userIdsToBan = [matchResult.userId];
      } else if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
        userIdsToBan.push(...spamUserIdsToAction);
      }

      if (userIdsToBan.length) {
        for (const userId of userIdsToBan) {
          await this.getModActions().banUserId(userId, reason, { contactMethods, caseArgs });
        }

        actionsTaken.push("ban");
      }
    }

    if (rule.actions.change_nickname) {
      const userIdsToChange =
        matchResult.type === "textspam" || matchResult.type === "otherspam"
          ? [...spamUserIdsToAction]
          : [matchResult.userId];

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
      const userIdsToChange =
        matchResult.type === "textspam" || matchResult.type === "otherspam"
          ? [...spamUserIdsToAction]
          : [matchResult.userId];

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
      const userIdsToChange =
        matchResult.type === "textspam" || matchResult.type === "otherspam"
          ? [...spamUserIdsToAction]
          : [matchResult.userId];

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

    if (rule.actions.set_antiraid_level !== undefined) {
      await this.setAntiraidLevel(rule.actions.set_antiraid_level);
      actionsTaken.push("set antiraid level");
    }

    if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
      for (const action of matchResult.recentActions) {
        action.actioned = true;
      }

      if (recentSpam) {
        for (const id of spamUserIdsToAction) {
          recentSpam.actionedUsers.add(id);
        }
      } else {
        const newRecentSpamEntry: RecentSpam = {
          actionedUsers: new Set(spamUserIdsToAction),
          expiresAt: Date.now() + RECENT_SPAM_EXPIRY_TIME,
          archiveId,
        };
        this.recentSpam.set(recentSpamKey, newRecentSpamEntry);
      }
    }

    // Don't wait for the rest before continuing to other automod items in the queue
    (async () => {
      let user;
      let users;
      let safeUser;
      let safeUsers;

      if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
        users = spamUserIdsToAction.map(id => this.getUser(id));
      } else {
        user = this.getUser(matchResult.userId);
        users = [user];
      }

      safeUser = user ? stripObjectToScalars(user) : null;
      safeUsers = users.map(u => stripObjectToScalars(u));

      const logData = {
        rule: rule.name,
        user: safeUser,
        users: safeUsers,
        actionsTaken: actionsTaken.length ? actionsTaken.join(", ") : "<none>",
        matchSummary,
      };

      if (recentSpam && !spamUserIdsToAction.length) {
        // This action was part of a recent spam match and we didn't find any new users to action i.e. the only users
        // who triggered this match had already been actioned. In that case, we don't need to post any new log messages.
        return;
      }

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

    if (matchResult.type === "textspam" || matchResult.type === "otherspam") {
      logger.warn("Spam cooldowns are WIP and not currently functional");
    }

    if (matchResult.type === "message" || matchResult.type === "embed") {
      cooldownKey += matchResult.userId;
    } else if (
      matchResult.type === "username" ||
      matchResult.type === "nickname" ||
      matchResult.type === "visiblename" ||
      matchResult.type === "customstatus"
    ) {
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
  protected async getMatchSummary(matchResult: AnyTriggerMatchResult, archiveId: string = null): Promise<string> {
    if (matchResult.type === "message" || matchResult.type === "embed") {
      const message = await this.savedMessages.find(matchResult.messageInfo.messageId);
      const channel = this.guild.channels.get(matchResult.messageInfo.channelId);
      const channelMention = channel ? verboseChannelMention(channel) : `\`#${message.channel_id}\``;

      return trimPluginDescription(`
        Matched ${this.getMatchedValueText(matchResult)} in message in ${channelMention}:
        ${messageSummary(message)}
      `);
    } else if (matchResult.type === "textspam") {
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
    } else if (matchResult.type === "otherspam") {
      return `Matched other spam`;
    }

    return "";
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
    } else if (matchResult.trigger === "match_attachment_type") {
      return `attachment type \`${disableInlineCode(matchResult.matchedValue)}\``;
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

  /**
   * When a new member joins, check for both join triggers and join spam triggers
   */
  @d.event("guildMemberAdd")
  protected onMemberJoin(_, member: Member) {
    if (member.user.bot) return;

    this.automodQueue.add(async () => {
      if (this.unloaded) return;

      await this.addRecentAction({
        identifier: RAID_SPAM_IDENTIFIER,
        type: RecentActionType.MemberJoin,
        userId: member.id,
        timestamp: Date.now(),
        count: 1,
      });

      const config = this.getConfigForMember(member);

      for (const [name, rule] of Object.entries(config.rules)) {
        const spamMatch = await this.matchOtherSpamInRule(rule, member.id);
        if (spamMatch) {
          await this.applyActionsOnMatch(rule, spamMatch);
        }

        const joinMatch = await this.matchMemberJoinTriggerInRule(rule, member);
        if (joinMatch) {
          await this.applyActionsOnMatch(rule, joinMatch);
        }
      }
    });
  }

  protected async setAntiraidLevel(level: string | null, user?: User) {
    this.cachedAntiraidLevel = level;
    await this.antiraidLevels.set(level);

    if (user) {
      this.guildLogs.log(LogType.SET_ANTIRAID_USER, {
        level: level ?? "off",
        user: stripObjectToScalars(user),
      });
    } else {
      this.guildLogs.log(LogType.SET_ANTIRAID_AUTO, {
        level: level ?? "off",
      });
    }
  }

  @d.command("antiraid clear", [], {
    aliases: ["antiraid reset", "antiraid none", "antiraid off"],
  })
  @d.permission("can_set_antiraid")
  public async clearAntiraidCmd(msg: Message) {
    await this.setAntiraidLevel(null, msg.author);
    this.sendSuccessMessage(msg.channel, "Anti-raid turned **off**");
  }

  @d.command("antiraid", "<level:string>")
  @d.permission("can_set_antiraid")
  public async setAntiraidCmd(msg: Message, args: { level: string }) {
    if (!this.getConfig().antiraid_levels.includes(args.level)) {
      this.sendErrorMessage(msg.channel, "Unknown anti-raid level");
      return;
    }

    await this.setAntiraidLevel(args.level, msg.author);
    this.sendSuccessMessage(msg.channel, `Anti-raid set to **${args.level}**`);
  }

  @d.command("antiraid")
  @d.permission("can_view_antiraid")
  public async viewAntiraidCmd(msg: Message, args: { level: string }) {
    if (this.cachedAntiraidLevel) {
      msg.channel.createMessage(`Anti-raid is set to **${this.cachedAntiraidLevel}**`);
    } else {
      msg.channel.createMessage("Anti-raid is off!");
    }
  }
}
