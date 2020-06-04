import { decorators as d, IPluginOptions, logger, waitForReaction, waitForReply } from "knub";
import { Attachment, Constants as ErisConstants, Guild, Member, Message, TextChannel, User } from "eris";
import humanizeDuration from "humanize-duration";
import { GuildCases } from "../data/GuildCases";
import {
  asSingleLine,
  createChunkedMessage,
  disableUserNotificationStrings,
  errorMessage,
  findRelevantAuditLogEntry,
  isDiscordHTTPError,
  isDiscordRESTError,
  MINUTES,
  multiSorter,
  notifyUser,
  stripObjectToScalars,
  tNullable,
  trimLines,
  ucfirst,
  UnknownUser,
  UserNotificationMethod,
  UserNotificationResult,
} from "../utils";
import { GuildMutes } from "../data/GuildMutes";
import { CaseTypes } from "../data/CaseTypes";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { trimPluginDescription, ZeppelinPlugin } from "./ZeppelinPlugin";
import { Case } from "../data/entities/Case";
import { renderTemplate } from "../templateFormatter";
import { CaseArgs, CasesPlugin } from "./Cases";
import { MuteResult, MutesPlugin } from "./Mutes";
import * as t from "io-ts";
import { ERRORS, RecoverablePluginError } from "../RecoverablePluginError";

const ConfigSchema = t.type({
  dm_on_warn: t.boolean,
  dm_on_kick: t.boolean,
  dm_on_ban: t.boolean,
  message_on_warn: t.boolean,
  message_on_kick: t.boolean,
  message_on_ban: t.boolean,
  message_channel: tNullable(t.string),
  warn_message: tNullable(t.string),
  kick_message: tNullable(t.string),
  ban_message: tNullable(t.string),
  alert_on_rejoin: t.boolean,
  alert_channel: tNullable(t.string),
  warn_notify_enabled: t.boolean,
  warn_notify_threshold: t.number,
  warn_notify_message: t.string,
  ban_delete_message_days: t.number,
  can_note: t.boolean,
  can_warn: t.boolean,
  can_mute: t.boolean,
  can_kick: t.boolean,
  can_ban: t.boolean,
  can_view: t.boolean,
  can_addcase: t.boolean,
  can_massban: t.boolean,
  can_hidecase: t.boolean,
  can_act_as_other: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

enum IgnoredEventType {
  Ban = 1,
  Unban,
  Kick,
}

interface IIgnoredEvent {
  type: IgnoredEventType;
  userId: string;
}

export type WarnResult =
  | {
      status: "failed";
      error: string;
    }
  | {
      status: "success";
      case: Case;
      notifyResult: UserNotificationResult;
    };

export type KickResult =
  | {
      status: "failed";
      error: string;
    }
  | {
      status: "success";
      case: Case;
      notifyResult: UserNotificationResult;
    };

export type BanResult =
  | {
      status: "failed";
      error: string;
    }
  | {
      status: "success";
      case: Case;
      notifyResult: UserNotificationResult;
    };

type WarnMemberNotifyRetryCallback = () => boolean | Promise<boolean>;

export interface WarnOptions {
  caseArgs?: Partial<CaseArgs>;
  contactMethods?: UserNotificationMethod[];
  retryPromptChannel?: TextChannel;
}

export interface KickOptions {
  caseArgs?: Partial<CaseArgs>;
  contactMethods?: UserNotificationMethod[];
}

export interface BanOptions {
  caseArgs?: Partial<CaseArgs>;
  contactMethods?: UserNotificationMethod[];
  deleteMessageDays?: number;
}

export class ModActionsPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "mod_actions";
  public static dependencies = ["cases", "mutes"];
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Mod actions",
    description: trimPluginDescription(`
      This plugin contains the 'typical' mod actions such as warning, muting, kicking, banning, etc.
    `),
  };

  protected mutes: GuildMutes;
  protected cases: GuildCases;
  protected serverLogs: GuildLogs;

  protected ignoredEvents: IIgnoredEvent[];

  async onLoad() {
    this.mutes = GuildMutes.getGuildInstance(this.guildId);
    this.cases = GuildCases.getGuildInstance(this.guildId);
    this.serverLogs = new GuildLogs(this.guildId);

    this.ignoredEvents = [];
  }

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        dm_on_warn: true,
        dm_on_kick: false,
        dm_on_ban: false,
        message_on_warn: false,
        message_on_kick: false,
        message_on_ban: false,
        message_channel: null,
        warn_message: "You have received a warning on the {guildName} server: {reason}",
        kick_message: "You have been kicked from the {guildName} server. Reason given: {reason}",
        ban_message: "You have been banned from the {guildName} server. Reason given: {reason}",
        alert_on_rejoin: false,
        alert_channel: null,
        warn_notify_enabled: false,
        warn_notify_threshold: 5,
        warn_notify_message:
          "The user already has **{priorWarnings}** warnings!\n Please check their prior cases and assess whether or not to warn anyways.\n Proceed with the warning?",
        ban_delete_message_days: 1,

        can_note: false,
        can_warn: false,
        can_mute: false,
        can_kick: false,
        can_ban: false,
        can_view: false,
        can_addcase: false,
        can_massban: false,
        can_hidecase: false,
        can_act_as_other: false,
      },
      overrides: [
        {
          level: ">=50",
          config: {
            can_note: true,
            can_warn: true,
            can_mute: true,
            can_kick: true,
            can_ban: true,
            can_view: true,
            can_addcase: true,
          },
        },
        {
          level: ">=100",
          config: {
            can_massban: true,
            can_hidecase: true,
            can_act_as_other: true,
          },
        },
      ],
    };
  }

  ignoreEvent(type: IgnoredEventType, userId: any, timeout: number = null) {
    this.ignoredEvents.push({ type, userId });

    // Clear after expiry (15sec by default)
    setTimeout(() => {
      this.clearIgnoredEvent(type, userId);
    }, timeout || 1000 * 15);
  }

  isEventIgnored(type: IgnoredEventType, userId: any) {
    return this.ignoredEvents.some(info => type === info.type && userId === info.userId);
  }

  clearIgnoredEvent(type: IgnoredEventType, userId: any) {
    this.ignoredEvents.splice(
      this.ignoredEvents.findIndex(info => type === info.type && userId === info.userId),
      1,
    );
  }

  formatReasonWithAttachments(reason: string, attachments: Attachment[]) {
    const attachmentUrls = attachments.map(a => a.url);
    return ((reason || "") + " " + attachmentUrls.join(" ")).trim();
  }

  getDefaultContactMethods(type: "warn" | "kick" | "ban"): UserNotificationMethod[] {
    const methods: UserNotificationMethod[] = [];
    const config = this.getConfig();

    if (config[`dm_on_${type}`]) {
      methods.push({ type: "dm" });
    }

    if (config[`message_on_${type}`] && config.message_channel) {
      const channel = this.guild.channels.get(config.message_channel);
      if (channel instanceof TextChannel) {
        methods.push({
          type: "channel",
          channel,
        });
      }
    }

    return methods;
  }

  readContactMethodsFromArgs(args: {
    notify?: string;
    "notify-channel"?: TextChannel;
  }): null | UserNotificationMethod[] {
    if (args.notify) {
      if (args.notify === "dm") {
        return [{ type: "dm" }];
      } else if (args.notify === "channel") {
        if (!args["notify-channel"]) {
          throw new Error("No `-notify-channel` specified");
        }

        return [{ type: "channel", channel: args["notify-channel"] }];
      } else if (disableUserNotificationStrings.includes(args.notify)) {
        return [];
      } else {
        throw new Error("Unknown contact method");
      }
    }

    return null;
  }

  async isBanned(userId): Promise<boolean> {
    try {
      const bans = (await this.guild.getBans()) as any;
      return bans.some(b => b.user.id === userId);
    } catch (e) {
      if (isDiscordHTTPError(e) && e.code === 500) {
        return false;
      }

      throw e;
    }
  }

  async findRelevantAuditLogEntry(actionType: number, userId: string, attempts?: number, attemptDelay?: number) {
    try {
      return await findRelevantAuditLogEntry(this.guild, actionType, userId, attempts, attemptDelay);
    } catch (e) {
      if (isDiscordRESTError(e) && e.code === 50013) {
        this.serverLogs.log(LogType.BOT_ALERT, {
          body: "Missing permissions to read audit log",
        });
      } else {
        throw e;
      }
    }
  }

  /**
   * Add a BAN action automatically when a user is banned.
   * Attempts to find the ban's details in the audit log.
   */
  @d.event("guildBanAdd")
  async onGuildBanAdd(guild: Guild, user: User) {
    if (this.isEventIgnored(IgnoredEventType.Ban, user.id)) {
      this.clearIgnoredEvent(IgnoredEventType.Ban, user.id);
      return;
    }

    const relevantAuditLogEntry = await this.findRelevantAuditLogEntry(
      ErisConstants.AuditLogActions.MEMBER_BAN_ADD,
      user.id,
    );

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      casesPlugin.createCase({
        userId: user.id,
        modId,
        type: CaseTypes.Ban,
        auditLogId,
        reason: relevantAuditLogEntry.reason,
        automatic: true,
      });
    } else {
      casesPlugin.createCase({
        userId: user.id,
        modId: null,
        type: CaseTypes.Ban,
      });
    }
  }

  /**
   * Add an UNBAN mod action automatically when a user is unbanned.
   * Attempts to find the unban's details in the audit log.
   */
  @d.event("guildBanRemove")
  async onGuildBanRemove(guild: Guild, user: User) {
    if (this.isEventIgnored(IgnoredEventType.Unban, user.id)) {
      this.clearIgnoredEvent(IgnoredEventType.Unban, user.id);
      return;
    }

    const relevantAuditLogEntry = await this.findRelevantAuditLogEntry(
      ErisConstants.AuditLogActions.MEMBER_BAN_REMOVE,
      user.id,
    );

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      casesPlugin.createCase({
        userId: user.id,
        modId,
        type: CaseTypes.Unban,
        auditLogId,
        automatic: true,
      });
    } else {
      casesPlugin.createCase({
        userId: user.id,
        modId: null,
        type: CaseTypes.Unban,
        automatic: true,
      });
    }
  }

  /**
   * Show an alert if a member with prior notes joins the server
   */
  @d.event("guildMemberAdd")
  async onGuildMemberAdd(_, member: Member) {
    const config = this.getConfig();

    if (!config.alert_on_rejoin) return;

    const alertChannelId = config.alert_channel;
    if (!alertChannelId) return;

    const actions = await this.cases.getByUserId(member.id);

    if (actions.length) {
      const alertChannel: any = this.guild.channels.get(alertChannelId);
      alertChannel.send(
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${member.id}\`) joined with ${actions.length} prior record(s)`,
      );
    }
  }

  @d.event("guildMemberRemove")
  async onGuildMemberRemove(_, member: Member) {
    if (this.isEventIgnored(IgnoredEventType.Kick, member.id)) {
      this.clearIgnoredEvent(IgnoredEventType.Kick, member.id);
      return;
    }

    const kickAuditLogEntry = await this.findRelevantAuditLogEntry(
      ErisConstants.AuditLogActions.MEMBER_KICK,
      member.id,
    );

    if (kickAuditLogEntry) {
      const existingCaseForThisEntry = await this.cases.findByAuditLogId(kickAuditLogEntry.id);
      if (existingCaseForThisEntry) {
        logger.warn(
          `Tried to create duplicate case for audit log entry ${kickAuditLogEntry.id}, existing case id ${existingCaseForThisEntry.id}`,
        );
      } else {
        const casesPlugin = this.getPlugin<CasesPlugin>("cases");
        casesPlugin.createCase({
          userId: member.id,
          modId: kickAuditLogEntry.user.id,
          type: CaseTypes.Kick,
          auditLogId: kickAuditLogEntry.id,
          reason: kickAuditLogEntry.reason,
          automatic: true,
        });
      }

      this.serverLogs.log(LogType.MEMBER_KICK, {
        user: stripObjectToScalars(member.user),
        mod: stripObjectToScalars(kickAuditLogEntry.user),
      });
    }
  }

  /**
   * Kick the specified server member. Generates a case.
   */
  async kickMember(member: Member, reason: string = null, kickOptions: KickOptions = {}): Promise<KickResult> {
    const config = this.getConfig();

    // Attempt to message the user *before* kicking them, as doing it after may not be possible
    let notifyResult: UserNotificationResult = { method: null, success: true };
    if (reason) {
      const kickMessage = await renderTemplate(config.kick_message, {
        guildName: this.guild.name,
        reason,
      });

      const contactMethods = kickOptions?.contactMethods
        ? kickOptions.contactMethods
        : this.getDefaultContactMethods("kick");
      notifyResult = await notifyUser(member.user, kickMessage, contactMethods);
    }

    // Kick the user
    this.serverLogs.ignoreLog(LogType.MEMBER_KICK, member.id);
    this.ignoreEvent(IgnoredEventType.Kick, member.id);
    try {
      await member.kick();
    } catch (e) {
      return {
        status: "failed",
        error: e.message,
      };
    }

    // Create a case for this action
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      ...(kickOptions.caseArgs || {}),
      userId: member.id,
      modId: kickOptions.caseArgs?.modId,
      type: CaseTypes.Kick,
      reason,
      noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
    });

    // Log the action
    const mod = await this.resolveUser(kickOptions.caseArgs?.modId);
    this.serverLogs.log(LogType.MEMBER_KICK, {
      mod: stripObjectToScalars(mod),
      user: stripObjectToScalars(member.user),
      reason,
    });

    return {
      status: "success",
      case: createdCase,
      notifyResult,
    };
  }

  /**
   * Ban the specified user id, whether or not they're actually on the server at the time. Generates a case.
   */
  async banUserId(userId: string, reason: string = null, banOptions: BanOptions = {}): Promise<BanResult> {
    const config = this.getConfig();
    const user = await this.resolveUser(userId);

    // Attempt to message the user *before* banning them, as doing it after may not be possible
    let notifyResult: UserNotificationResult = { method: null, success: true };
    if (reason && user instanceof User) {
      const banMessage = await renderTemplate(config.ban_message, {
        guildName: this.guild.name,
        reason,
      });

      const contactMethods = banOptions?.contactMethods
        ? banOptions.contactMethods
        : this.getDefaultContactMethods("ban");
      notifyResult = await notifyUser(user, banMessage, contactMethods);
    }

    // (Try to) ban the user
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId);
    this.ignoreEvent(IgnoredEventType.Ban, userId);
    try {
      const deleteMessageDays = Math.min(30, Math.max(0, banOptions.deleteMessageDays ?? 1));
      await this.guild.banMember(userId, deleteMessageDays);
    } catch (e) {
      return {
        status: "failed",
        error: e.message,
      };
    }

    // Create a case for this action
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      ...(banOptions.caseArgs || {}),
      userId,
      modId: banOptions.caseArgs?.modId,
      type: CaseTypes.Ban,
      reason,
      noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
    });

    // Log the action
    const mod = await this.resolveUser(banOptions.caseArgs?.modId);
    this.serverLogs.log(LogType.MEMBER_BAN, {
      mod: stripObjectToScalars(mod),
      user: stripObjectToScalars(user),
      reason,
    });

    return {
      status: "success",
      case: createdCase,
      notifyResult,
    };
  }

  @d.command("update", "<caseNumber:number> [note:string$]", {
    overloads: ["[note:string$]"],
    extra: {
      info: {
        description:
          "Update the specified case (or, if case number is omitted, your latest case) by adding more notes/details to it",
      },
    },
  })
  @d.permission("can_note")
  async updateCmd(msg: Message, args: { caseNumber?: number; note?: string }) {
    let theCase: Case;
    if (args.caseNumber != null) {
      theCase = await this.cases.findByCaseNumber(args.caseNumber);
    } else {
      theCase = await this.cases.findLatestByModId(msg.author.id);
    }

    if (!theCase) {
      this.sendErrorMessage(msg.channel, "Case not found");
      return;
    }

    if (!args.note && msg.attachments.length === 0) {
      this.sendErrorMessage(msg.channel, "Text or attachment required");
      return;
    }

    const note = this.formatReasonWithAttachments(args.note, msg.attachments);

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    await casesPlugin.createCaseNote({
      caseId: theCase.id,
      modId: msg.author.id,
      body: note,
    });

    this.serverLogs.log(LogType.CASE_UPDATE, {
      mod: msg.author,
      caseNumber: theCase.case_number,
      caseType: CaseTypes[theCase.type],
      note,
    });

    this.sendSuccessMessage(msg.channel, `Case \`#${theCase.case_number}\` updated`);
  }

  @d.command("note", "<user:string> <note:string$>", {
    extra: {
      info: {
        description: "Add a note to the specified user",
      },
    },
  })
  @d.permission("can_note")
  async noteCmd(msg: Message, args: { user: string; note: string }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const userName = `${user.username}#${user.discriminator}`;
    const reason = this.formatReasonWithAttachments(args.note, msg.attachments);

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      userId: user.id,
      modId: msg.author.id,
      type: CaseTypes.Note,
      reason,
    });

    this.serverLogs.log(LogType.MEMBER_NOTE, {
      mod: stripObjectToScalars(msg.author),
      user: stripObjectToScalars(user, ["user", "roles"]),
      reason,
    });

    this.sendSuccessMessage(msg.channel, `Note added on **${userName}** (Case #${createdCase.case_number})`);
  }

  @d.command("warn", "<user:string> <reason:string$>", {
    options: [
      { name: "mod", type: "member" },
      { name: "notify", type: "string" },
      { name: "notify-channel", type: "channel" },
    ],
    extra: {
      info: {
        description: "Send a warning to the specified user",
      },
    },
  })
  @d.permission("can_warn")
  async warnCmd(
    msg: Message,
    args: { user: string; reason: string; mod?: Member; notify?: string; "notify-channel"?: TextChannel },
  ) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const memberToWarn = await this.getMember(user.id);

    if (!memberToWarn) {
      const isBanned = await this.isBanned(user.id);
      if (isBanned) {
        this.sendErrorMessage(msg.channel, `User is banned`);
      } else {
        this.sendErrorMessage(msg.channel, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to warn this member
    if (!this.canActOn(msg.member, memberToWarn)) {
      msg.channel.createMessage(errorMessage("Cannot warn: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for -mod"));
        return;
      }

      mod = args.mod;
    }

    const config = this.getConfig();
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const priorWarnAmount = await casesPlugin.getCaseTypeAmountForUserId(memberToWarn.id, CaseTypes.Warn);
    if (config.warn_notify_enabled && priorWarnAmount >= config.warn_notify_threshold) {
      const tooManyWarningsMsg = await msg.channel.createMessage(
        config.warn_notify_message.replace("{priorWarnings}", `${priorWarnAmount}`),
      );

      const reply = await waitForReaction(this.bot, tooManyWarningsMsg, ["✅", "❌"]);
      tooManyWarningsMsg.delete();
      if (!reply || reply.name === "❌") {
        msg.channel.createMessage(errorMessage("Warn cancelled by moderator"));
        return;
      }
    }

    let contactMethods;
    try {
      contactMethods = this.readContactMethodsFromArgs(args);
    } catch (e) {
      this.sendErrorMessage(msg.channel, e.message);
      return;
    }

    const warnResult = await this.warnMember(memberToWarn, reason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: mod.id !== msg.author.id ? msg.author.id : null,
        reason,
      },
      retryPromptChannel: msg.channel as TextChannel,
    });

    if (warnResult.status === "failed") {
      this.sendErrorMessage(msg.channel, "Failed to warn user");
      return;
    }

    const messageResultText = warnResult.notifyResult.text ? ` (${warnResult.notifyResult.text})` : "";

    this.sendSuccessMessage(
      msg.channel,
      `Warned **${memberToWarn.user.username}#${memberToWarn.user.discriminator}** (Case #${warnResult.case.case_number})${messageResultText}`,
    );
  }

  async warnMember(member: Member, reason: string, warnOptions: WarnOptions = {}): Promise<WarnResult | null> {
    const config = this.getConfig();

    const warnMessage = config.warn_message.replace("{guildName}", this.guild.name).replace("{reason}", reason);
    const contactMethods = warnOptions?.contactMethods
      ? warnOptions.contactMethods
      : this.getDefaultContactMethods("warn");
    const notifyResult = await notifyUser(member.user, warnMessage, contactMethods);

    if (!notifyResult.success) {
      if (warnOptions.retryPromptChannel && this.guild.channels.has(warnOptions.retryPromptChannel.id)) {
        const failedMsg = await warnOptions.retryPromptChannel.createMessage(
          "Failed to message the user. Log the warning anyway?",
        );
        const reply = await waitForReaction(this.bot, failedMsg, ["✅", "❌"]);
        failedMsg.delete();
        if (!reply || reply.name === "❌") {
          return {
            status: "failed",
            error: "Failed to message user",
          };
        }
      } else {
        return {
          status: "failed",
          error: "Failed to message user",
        };
      }
    }

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      ...(warnOptions.caseArgs || {}),
      userId: member.id,
      modId: warnOptions.caseArgs?.modId,
      type: CaseTypes.Warn,
      reason,
      noteDetails: notifyResult.text ? [ucfirst(notifyResult.text)] : [],
    });

    const mod = await this.resolveUser(warnOptions.caseArgs?.modId);
    this.serverLogs.log(LogType.MEMBER_WARN, {
      mod: stripObjectToScalars(mod),
      member: stripObjectToScalars(member, ["user", "roles"]),
      reason,
    });

    return {
      status: "success",
      case: createdCase,
      notifyResult,
    };
  }

  /**
   * The actual function run by both !mute and !forcemute.
   * The only difference between the two commands is in target member validation.
   */
  async actualMuteCmd(
    user: User | UnknownUser,
    msg: Message,
    args: { time?: number; reason?: string; mod: Member; notify?: string; "notify-channel"?: TextChannel },
  ) {
    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    let pp = null;

    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for -mod"));
        return;
      }

      mod = args.mod;
      pp = msg.author;
    }

    const timeUntilUnmute = args.time && humanizeDuration(args.time);
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    let muteResult: MuteResult;
    const mutesPlugin = this.getPlugin<MutesPlugin>("mutes");

    let contactMethods;
    try {
      contactMethods = this.readContactMethodsFromArgs(args);
    } catch (e) {
      this.sendErrorMessage(msg.channel, e.message);
      return;
    }

    try {
      muteResult = await mutesPlugin.muteUser(user.id, args.time, reason, {
        contactMethods,
        caseArgs: {
          modId: mod.id,
          ppId: pp && pp.id,
        },
      });
    } catch (e) {
      if (e instanceof RecoverablePluginError && e.code === ERRORS.NO_MUTE_ROLE_IN_CONFIG) {
        this.sendErrorMessage(msg.channel, "Could not mute the user: no mute role set in config");
      } else if (isDiscordRESTError(e) && e.code === 10007) {
        this.sendErrorMessage(msg.channel, "Could not mute the user: unknown member");
      } else {
        logger.error(`Failed to mute user ${user.id}: ${e.stack}`);
        if (user.id == null) {
          console.trace("[DEBUG] Null user.id for mute");
        }
        this.sendErrorMessage(msg.channel, "Could not mute the user");
      }

      return;
    }

    // Confirm the action to the moderator
    let response;
    if (args.time) {
      if (muteResult.updatedExistingMute) {
        response = asSingleLine(`
          Updated **${user.username}#${user.discriminator}**'s
          mute to ${timeUntilUnmute} (Case #${muteResult.case.case_number})
        `);
      } else {
        response = asSingleLine(`
          Muted **${user.username}#${user.discriminator}**
          for ${timeUntilUnmute} (Case #${muteResult.case.case_number})
        `);
      }
    } else {
      if (muteResult.updatedExistingMute) {
        response = asSingleLine(`
          Updated **${user.username}#${user.discriminator}**'s
          mute to indefinite (Case #${muteResult.case.case_number})
        `);
      } else {
        response = asSingleLine(`
          Muted **${user.username}#${user.discriminator}**
          indefinitely (Case #${muteResult.case.case_number})
        `);
      }
    }

    if (muteResult.notifyResult.text) response += ` (${muteResult.notifyResult.text})`;
    this.sendSuccessMessage(msg.channel, response);
  }

  @d.command("mute", "<user:string> <time:delay> <reason:string$>", {
    overloads: ["<user:string> <time:delay>", "<user:string> [reason:string$]"],
    options: [
      { name: "mod", type: "member" },
      { name: "notify", type: "string" },
      { name: "notify-channel", type: "channel" },
    ],
    extra: {
      info: {
        description: "Mute the specified member",
      },
    },
  })
  @d.permission("can_mute")
  async muteCmd(
    msg: Message,
    args: {
      user: string;
      time?: number;
      reason?: string;
      mod: Member;
      notify?: string;
      "notify-channel"?: TextChannel;
    },
  ) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const memberToMute = await this.getMember(user.id);

    if (!memberToMute) {
      const isBanned = await this.isBanned(user.id);
      const prefix = this.guildConfig.prefix;
      if (isBanned) {
        this.sendErrorMessage(
          msg.channel,
          `User is banned. Use \`${prefix}forcemute\` if you want to mute them anyway.`,
        );
      } else {
        this.sendErrorMessage(
          msg.channel,
          `User is not on the server. Use \`${prefix}forcemute\` if you want to mute them anyway.`,
        );
      }

      return;
    }

    // Make sure we're allowed to mute this member
    if (memberToMute && !this.canActOn(msg.member, memberToMute)) {
      this.sendErrorMessage(msg.channel, "Cannot mute: insufficient permissions");
      return;
    }

    this.actualMuteCmd(user, msg, args);
  }

  @d.command("forcemute", "<user:string> <time:delay> <reason:string$>", {
    overloads: ["<user:string> <time:delay>", "<user:string> [reason:string$]"],
    options: [
      { name: "mod", type: "member" },
      { name: "notify", type: "string" },
      { name: "notify-channel", type: "channel" },
    ],
    extra: {
      info: {
        description: "Force-mute the specified user, even if they're not on the server",
      },
    },
  })
  @d.permission("can_mute")
  async forcemuteCmd(
    msg: Message,
    args: {
      user: string;
      time?: number;
      reason?: string;
      mod: Member;
      notify?: string;
      "notify-channel"?: TextChannel;
    },
  ) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const memberToMute = await this.getMember(user.id);

    // Make sure we're allowed to mute this user
    if (memberToMute && !this.canActOn(msg.member, memberToMute)) {
      this.sendErrorMessage(msg.channel, "Cannot mute: insufficient permissions");
      return;
    }

    this.actualMuteCmd(user, msg, args);
  }

  /**
   * The actual function run by both !unmute and !forceunmute.
   * The only difference between the two commands is in target member validation.
   */
  async actualUnmuteCmd(
    user: User | UnknownUser,
    msg: Message,
    args: { time?: number; reason?: string; mod?: Member },
  ) {
    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.author;
    let pp = null;

    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod.user;
      pp = msg.author;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    const mutesPlugin = this.getPlugin<MutesPlugin>("mutes");
    const result = await mutesPlugin.unmuteUser(user.id, args.time, {
      modId: mod.id,
      ppId: pp && pp.id,
      reason,
    });

    // Confirm the action to the moderator
    if (args.time) {
      const timeUntilUnmute = args.time && humanizeDuration(args.time);
      this.sendSuccessMessage(
        msg.channel,
        asSingleLine(`
        Unmuting **${user.username}#${user.discriminator}**
        in ${timeUntilUnmute} (Case #${result.case.case_number})
      `),
      );
    } else {
      this.sendSuccessMessage(
        msg.channel,
        asSingleLine(`
        Unmuted **${user.username}#${user.discriminator}**
        (Case #${result.case.case_number})
      `),
      );
    }
  }

  @d.command("unmute", "<user:string> <time:delay> <reason:string$>", {
    overloads: ["<user:string> <time:delay>", "<user:string> [reason:string$]"],
    options: [{ name: "mod", type: "member" }],
    extra: {
      info: {
        description: "Unmute the specified member",
      },
    },
  })
  @d.permission("can_mute")
  async unmuteCmd(msg: Message, args: { user: string; time?: number; reason?: string; mod?: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);
    const memberToUnmute = await this.getMember(user.id);
    const mutesPlugin = this.getPlugin<MutesPlugin>("mutes");
    const hasMuteRole = memberToUnmute && mutesPlugin.hasMutedRole(memberToUnmute);

    // Check if they're muted in the first place
    if (!(await this.mutes.isMuted(args.user)) && !hasMuteRole) {
      this.sendErrorMessage(msg.channel, "Cannot unmute: member is not muted");
      return;
    }

    if (!memberToUnmute) {
      const isBanned = await this.isBanned(user.id);
      const prefix = this.guildConfig.prefix;
      if (isBanned) {
        this.sendErrorMessage(msg.channel, `User is banned. Use \`${prefix}forceunmute\` to unmute them anyway.`);
      } else {
        this.sendErrorMessage(
          msg.channel,
          `User is not on the server. Use \`${prefix}forceunmute\` to unmute them anyway.`,
        );
      }

      return;
    }

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !this.canActOn(msg.member, memberToUnmute)) {
      this.sendErrorMessage(msg.channel, "Cannot unmute: insufficient permissions");
      return;
    }

    this.actualUnmuteCmd(user, msg, args);
  }

  @d.command("forceunmute", "<user:string> <time:delay> <reason:string$>", {
    overloads: ["<user:string> <time:delay>", "<user:string> [reason:string$]"],
    options: [{ name: "mod", type: "member" }],
    extra: {
      info: {
        description: "Force-unmute the specified user, even if they're not on the server",
      },
    },
  })
  @d.permission("can_mute")
  async forceunmuteCmd(msg: Message, args: { user: string; time?: number; reason?: string; mod?: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    // Check if they're muted in the first place
    if (!(await this.mutes.isMuted(user.id))) {
      this.sendErrorMessage(msg.channel, "Cannot unmute: member is not muted");
      return;
    }

    // Find the server member to unmute
    const memberToUnmute = await this.getMember(user.id);

    // Make sure we're allowed to unmute this member
    if (memberToUnmute && !this.canActOn(msg.member, memberToUnmute)) {
      this.sendErrorMessage(msg.channel, "Cannot unmute: insufficient permissions");
      return;
    }

    this.actualUnmuteCmd(user, msg, args);
  }

  @d.command("kick", "<user:string> [reason:string$]", {
    options: [
      { name: "mod", type: "member" },
      { name: "notify", type: "string" },
      { name: "notify-channel", type: "channel" },
      { name: "clean", isSwitch: true },
    ],
    extra: {
      info: {
        description: "Kick the specified member",
      },
    },
  })
  @d.permission("can_kick")
  async kickCmd(
    msg,
    args: {
      user: string;
      reason: string;
      mod: Member;
      notify?: string;
      "notify-channel"?: TextChannel;
      clean?: boolean;
    },
  ) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const memberToKick = await this.getMember(user.id);

    if (!memberToKick) {
      const isBanned = await this.isBanned(user.id);
      if (isBanned) {
        this.sendErrorMessage(msg.channel, `User is banned`);
      } else {
        this.sendErrorMessage(msg.channel, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to kick this member
    if (!this.canActOn(msg.member, memberToKick)) {
      this.sendErrorMessage(msg.channel, "Cannot kick: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod;
    }

    let contactMethods;
    try {
      contactMethods = this.readContactMethodsFromArgs(args);
    } catch (e) {
      this.sendErrorMessage(msg.channel, e.message);
      return;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    const kickResult = await this.kickMember(memberToKick, reason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: mod.id !== msg.author.id ? msg.author.id : null,
      },
    });

    if (args.clean) {
      this.serverLogs.ignoreLog(LogType.MEMBER_BAN, memberToKick.id);
      this.ignoreEvent(IgnoredEventType.Ban, memberToKick.id);

      try {
        await memberToKick.ban(1);
      } catch (e) {
        this.sendErrorMessage(msg.channel, "Failed to ban the user to clean messages (-clean)");
      }

      this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, memberToKick.id);
      this.ignoreEvent(IgnoredEventType.Unban, memberToKick.id);

      try {
        await this.guild.unbanMember(memberToKick.id);
      } catch (e) {
        this.sendErrorMessage(msg.channel, "Failed to unban the user after banning them (-clean)");
      }
    }

    if (kickResult.status === "failed") {
      msg.channel.createMessage(errorMessage(`Failed to kick user`));
      return;
    }

    // Confirm the action to the moderator
    let response = `Kicked **${memberToKick.user.username}#${memberToKick.user.discriminator}** (Case #${kickResult.case.case_number})`;

    if (kickResult.notifyResult.text) response += ` (${kickResult.notifyResult.text})`;
    this.sendSuccessMessage(msg.channel, response);
  }

  @d.command("ban", "<user:string> [reason:string$]", {
    options: [
      { name: "mod", type: "member" },
      { name: "notify", type: "string" },
      { name: "notify-channel", type: "channel" },
      { name: "delete-days", type: "number", shortcut: "d" },
    ],
    extra: {
      info: {
        description: "Ban the specified member",
      },
    },
  })
  @d.permission("can_ban")
  async banCmd(
    msg,
    args: {
      user: string;
      reason?: string;
      mod?: Member;
      notify?: string;
      "notify-channel"?: TextChannel;
      "delete-days"?: number;
    },
  ) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const memberToBan = await this.getMember(user.id);

    if (!memberToBan) {
      const isBanned = await this.isBanned(user.id);
      if (isBanned) {
        this.sendErrorMessage(msg.channel, `User is already banned`);
      } else {
        this.sendErrorMessage(msg.channel, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, memberToBan)) {
      this.sendErrorMessage(msg.channel, "Cannot ban: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod;
    }

    let contactMethods;
    try {
      contactMethods = this.readContactMethodsFromArgs(args);
    } catch (e) {
      this.sendErrorMessage(msg.channel, e.message);
      return;
    }

    const deleteMessageDays = args["delete-days"] ?? this.getConfigForMsg(msg).ban_delete_message_days;
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);
    const banResult = await this.banUserId(memberToBan.id, reason, {
      contactMethods,
      caseArgs: {
        modId: mod.id,
        ppId: mod.id !== msg.author.id ? msg.author.id : null,
      },
      deleteMessageDays,
    });

    if (banResult.status === "failed") {
      msg.channel.createMessage(errorMessage(`Failed to ban member`));
      return;
    }

    // Confirm the action to the moderator
    let response = `Banned **${memberToBan.user.username}#${memberToBan.user.discriminator}** (Case #${banResult.case.case_number})`;

    if (banResult.notifyResult.text) response += ` (${banResult.notifyResult.text})`;
    this.sendSuccessMessage(msg.channel, response);
  }

  @d.command("softban", "<user:string> [reason:string$]", {
    options: [
      { name: "mod", type: "member" },
      { name: "notify", type: "string" },
      { name: "notify-channel", type: "channel" },
    ],
    extra: {
      info: {
        description:
          '"Softban" the specified user by banning and immediately unbanning them. Effectively a kick with message deletions.' +
          "This command will be removed in the future, please use kick with the `-clean` argument instead",
      },
    },
  })
  @d.permission("can_kick")
  async softbanCmd(
    msg: Message,
    args: {
      user: string;
      reason: string;
      mod?: Member;
      notify?: string;
      "notify-channel"?: TextChannel;
    },
  ) {
    await this.kickCmd(msg, {
      user: args.user,
      mod: args.mod ? args.mod : msg.member,
      reason: args.reason,
      clean: true,
      notify: args.notify,
      "notify-channel": args["notify-channel"],
    });

    await msg.channel.createMessage(
      "Softban will be removed in the future - please use the kick command with the `-clean` argument instead!",
    );
  }

  @d.command("unban", "<user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
    extra: {
      info: {
        description: "Unban the specified member",
      },
    },
  })
  @d.permission("can_ban")
  async unbanCmd(msg: Message, args: { user: string; reason: string; mod: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod;
    }

    this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, user.id);

    try {
      this.ignoreEvent(IgnoredEventType.Unban, user.id);
      await this.guild.unbanMember(user.id);
    } catch (e) {
      this.sendErrorMessage(msg.channel, "Failed to unban member; are you sure they're banned?");
      return;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Create a case
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      userId: user.id,
      modId: mod.id,
      type: CaseTypes.Unban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    // Confirm the action
    this.sendSuccessMessage(msg.channel, `Member unbanned (Case #${createdCase.case_number})`);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_UNBAN, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
      reason,
    });
  }

  @d.command("forceban", "<user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
    extra: {
      info: {
        description: "Force-ban the specified user, even if they aren't on the server",
      },
    },
  })
  @d.permission("can_ban")
  async forcebanCmd(msg: Message, args: { user: string; reason?: string; mod?: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    // If the user exists as a guild member, make sure we can act on them first
    const member = await this.getMember(user.id);
    if (member && !this.canActOn(msg.member, member)) {
      this.sendErrorMessage(msg.channel, "Cannot forceban this user: insufficient permissions");
      return;
    }

    // Make sure the user isn't already banned
    const isBanned = await this.isBanned(user.id);
    if (isBanned) {
      this.sendErrorMessage(msg.channel, `User is already banned`);
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    this.ignoreEvent(IgnoredEventType.Ban, user.id);
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, user.id);

    try {
      await this.guild.banMember(user.id, 1);
    } catch (e) {
      this.sendErrorMessage(msg.channel, "Failed to forceban member");
      return;
    }

    // Create a case
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      userId: user.id,
      modId: mod.id,
      type: CaseTypes.Ban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    // Confirm the action
    this.sendSuccessMessage(msg.channel, `Member forcebanned (Case #${createdCase.case_number})`);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_FORCEBAN, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
      reason,
    });
  }

  @d.command("massban", "<userIds:string...>", {
    extra: {
      info: {
        description: "Mass-ban a list of user IDs",
      },
    },
  })
  @d.permission("can_massban")
  async massbanCmd(msg: Message, args: { userIds: string[] }) {
    // Limit to 100 users at once (arbitrary?)
    if (args.userIds.length > 100) {
      this.sendErrorMessage(msg.channel, `Can only massban max 100 users at once`);
      return;
    }

    // Ask for ban reason (cleaner this way instead of trying to cram it into the args)
    msg.channel.createMessage("Ban reason? `cancel` to cancel");
    const banReasonReply = await waitForReply(this.bot, msg.channel as TextChannel, msg.author.id);
    if (!banReasonReply || !banReasonReply.content || banReasonReply.content.toLowerCase().trim() === "cancel") {
      this.sendErrorMessage(msg.channel, "Cancelled");
      return;
    }

    const banReason = this.formatReasonWithAttachments(banReasonReply.content, msg.attachments);

    // Verify we can act on each of the users specified
    for (const userId of args.userIds) {
      const member = this.guild.members.get(userId); // TODO: Get members on demand?
      if (member && !this.canActOn(msg.member, member)) {
        this.sendErrorMessage(msg.channel, "Cannot massban one or more users: insufficient permissions");
        return;
      }
    }

    // Ignore automatic ban cases and logs for these users
    // We'll create our own cases below and post a single "mass banned" log instead
    args.userIds.forEach(userId => {
      // Use longer timeouts since this can take a while
      this.ignoreEvent(IgnoredEventType.Ban, userId, 120 * 1000);
      this.serverLogs.ignoreLog(LogType.MEMBER_BAN, userId, 120 * 1000);
    });

    // Show a loading indicator since this can take a while
    const loadingMsg = await msg.channel.createMessage("Banning...");

    // Ban each user and count failed bans (if any)
    const failedBans = [];
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    for (const userId of args.userIds) {
      try {
        await this.guild.banMember(userId, 1);

        await casesPlugin.createCase({
          userId,
          modId: msg.author.id,
          type: CaseTypes.Ban,
          reason: `Mass ban: ${banReason}`,
          postInCaseLogOverride: false,
        });
      } catch (e) {
        failedBans.push(userId);
      }
    }

    // Clear loading indicator
    loadingMsg.delete();

    const successfulBanCount = args.userIds.length - failedBans.length;
    if (successfulBanCount === 0) {
      // All bans failed - don't create a log entry and notify the user
      this.sendErrorMessage(msg.channel, "All bans failed. Make sure the IDs are valid.");
    } else {
      // Some or all bans were successful. Create a log entry for the mass ban and notify the user.
      this.serverLogs.log(LogType.MASSBAN, {
        mod: stripObjectToScalars(msg.author),
        count: successfulBanCount,
        reason: banReason,
      });

      if (failedBans.length) {
        this.sendSuccessMessage(
          msg.channel,
          `Banned ${successfulBanCount} users, ${failedBans.length} failed: ${failedBans.join(" ")}`,
        );
      } else {
        this.sendSuccessMessage(msg.channel, `Banned ${successfulBanCount} users successfully`);
      }
    }
  }

  @d.command("addcase", "<type:string> <user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
    extra: {
      info: {
        description: "Add an arbitrary case to the specified user without taking any action",
      },
    },
  })
  @d.permission("can_addcase")
  async addcaseCmd(msg: Message, args: { type: string; user: string; reason?: string; mod?: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    // If the user exists as a guild member, make sure we can act on them first
    const member = await this.getMember(user.id);
    if (member && !this.canActOn(msg.member, member)) {
      this.sendErrorMessage(msg.channel, "Cannot add case on this user: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified -mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for -mod");
        return;
      }

      mod = args.mod;
    }

    // Verify the case type is valid
    const type: string = args.type[0].toUpperCase() + args.type.slice(1).toLowerCase();
    if (!CaseTypes[type]) {
      this.sendErrorMessage(msg.channel, "Cannot add case: invalid case type");
      return;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Create the case
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const theCase: Case = await casesPlugin.createCase({
      userId: user.id,
      modId: mod.id,
      type: CaseTypes[type],
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    if (user) {
      this.sendSuccessMessage(
        msg.channel,
        `Case #${theCase.case_number} created for **${user.username}#${user.discriminator}**`,
      );
    } else {
      this.sendSuccessMessage(msg.channel, `Case #${theCase.case_number} created`);
    }

    // Log the action
    this.serverLogs.log(LogType.CASE_CREATE, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
      caseNum: theCase.case_number,
      caseType: type.toUpperCase(),
      reason,
    });
  }

  @d.command("case", "<caseNumber:number>", {
    extra: {
      info: {
        description: "Show information about a specific case",
      },
    },
  })
  @d.permission("can_view")
  async showCaseCmd(msg: Message, args: { caseNumber: number }) {
    const theCase = await this.cases.findByCaseNumber(args.caseNumber);

    if (!theCase) {
      this.sendErrorMessage(msg.channel, "Case not found");
      return;
    }

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const embed = await casesPlugin.getCaseEmbed(theCase.id);
    msg.channel.createMessage(embed);
  }

  @d.command("cases", "<user:string>", {
    options: [
      {
        name: "expand",
        shortcut: "e",
        isSwitch: true,
      },
      {
        name: "hidden",
        shortcut: "h",
        isSwitch: true,
      },
    ],
    extra: {
      info: {
        description: "Show a list of cases the specified user has",
      },
    },
  })
  @d.permission("can_view")
  async userCasesCmd(msg: Message, args: { user: string; expand?: boolean; hidden?: boolean }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const cases = await this.cases.with("notes").getByUserId(user.id);
    const normalCases = cases.filter(c => !c.is_hidden);
    const hiddenCases = cases.filter(c => c.is_hidden);

    const userName =
      user instanceof UnknownUser && cases.length
        ? cases[cases.length - 1].user_name
        : `${user.username}#${user.discriminator}`;

    if (cases.length === 0) {
      msg.channel.createMessage(`No cases found for **${userName}**`);
    } else {
      const casesToDisplay = args.hidden ? cases : normalCases;

      if (args.expand) {
        if (casesToDisplay.length > 8) {
          msg.channel.createMessage("Too many cases for expanded view. Please use compact view instead.");
          return;
        }

        // Expanded view (= individual case embeds)
        const casesPlugin = this.getPlugin<CasesPlugin>("cases");
        for (const theCase of casesToDisplay) {
          const embed = await casesPlugin.getCaseEmbed(theCase.id);
          msg.channel.createMessage(embed);
        }
      } else {
        // Compact view (= regular message with a preview of each case)
        const lines = [];
        for (const theCase of casesToDisplay) {
          theCase.notes.sort(multiSorter(["created_at", "id"]));
          const caseSummary = this.cases.getSummaryText(theCase);
          lines.push(caseSummary);
        }

        if (!args.hidden && hiddenCases.length) {
          if (hiddenCases.length === 1) {
            lines.push(`*+${hiddenCases.length} hidden case, use "-hidden" to show it*`);
          } else {
            lines.push(`*+${hiddenCases.length} hidden cases, use "-hidden" to show them*`);
          }
        }

        const finalMessage = trimLines(`
        Cases for **${userName}**:

        ${lines.join("\n")}

        Use the \`case <num>\` command to see more info about individual cases
      `);

        createChunkedMessage(msg.channel, finalMessage);
      }
    }
  }

  @d.command("cases", null, {
    options: [{ name: "mod", type: "Member" }],
    extra: {
      info: {
        description: "Show the most recent 5 cases by the specified -mod",
      },
    },
  })
  @d.permission("can_view")
  async recentCasesCmd(msg: Message, args: { mod?: Member }) {
    const modId = args.mod ? args.mod.id : msg.author.id;
    const recentCases = await this.cases.with("notes").getRecentByModId(modId, 5);

    const mod = this.bot.users.get(modId);
    const modName = mod ? `${mod.username}#${mod.discriminator}` : modId;

    if (recentCases.length === 0) {
      msg.channel.createMessage(errorMessage(`No cases by **${modName}**`));
    } else {
      const lines = recentCases.map(c => this.cases.getSummaryText(c));
      const finalMessage = trimLines(`
        Most recent 5 cases by **${modName}**:

        ${lines.join("\n")}

        Use the \`case <num>\` command to see more info about individual cases
        Use the \`cases <user>\` command to see a specific user's cases
      `);
      createChunkedMessage(msg.channel, finalMessage);
    }
  }

  @d.command("hide", "<caseNum:number>", {
    aliases: ["hidecase", "hide_case"],
    extra: {
      info: {
        description: "Hide the specified case so it doesn't appear in !cases or !info",
      },
    },
  })
  @d.permission("can_hidecase")
  async hideCaseCmd(msg: Message, args: { caseNum: number }) {
    const theCase = await this.cases.findByCaseNumber(args.caseNum);
    if (!theCase) {
      this.sendErrorMessage(msg.channel, "Case not found!");
      return;
    }

    await this.cases.setHidden(theCase.id, true);
    this.sendSuccessMessage(
      msg.channel,
      `Case #${theCase.case_number} is now hidden! Use \`unhidecase\` to unhide it.`,
    );
  }

  @d.command("unhide", "<caseNum:number>", {
    aliases: ["unhidecase", "unhide_case"],
    extra: {
      info: {
        description: "Un-hide the specified case, making it appear in !cases and !info again",
      },
    },
  })
  @d.permission("can_hidecase")
  async unhideCaseCmd(msg: Message, args: { caseNum: number }) {
    const theCase = await this.cases.findByCaseNumber(args.caseNum);
    if (!theCase) {
      this.sendErrorMessage(msg.channel, "Case not found!");
      return;
    }

    await this.cases.setHidden(theCase.id, false);
    this.sendSuccessMessage(msg.channel, `Case #${theCase.case_number} is no longer hidden!`);
  }
}
