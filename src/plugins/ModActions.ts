import { decorators as d, IPluginOptions, logger, waitForReaction, waitForReply } from "knub";
import { Attachment, Constants as ErisConstants, Guild, Member, Message, TextChannel, User } from "eris";
import humanizeDuration from "humanize-duration";
import { GuildCases } from "../data/GuildCases";
import {
  asSingleLine,
  createChunkedMessage,
  errorMessage,
  findRelevantAuditLogEntry,
  INotifyUserResult,
  multiSorter,
  notifyUser,
  NotifyUserStatus,
  stripObjectToScalars,
  successMessage,
  trimLines,
  ucfirst,
  UnknownUser,
} from "../utils";
import { GuildMutes } from "../data/GuildMutes";
import { CaseTypes } from "../data/CaseTypes";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { Case } from "../data/entities/Case";
import { renderTemplate } from "../templateFormatter";
import { CasesPlugin } from "./Cases";
import { MuteResult, MutesPlugin } from "./Mutes";

enum IgnoredEventType {
  Ban = 1,
  Unban,
  Kick,
}

interface IIgnoredEvent {
  type: IgnoredEventType;
  userId: string;
}

interface IModActionsPluginConfig {
  dm_on_warn: boolean;
  dm_on_kick: boolean;
  dm_on_ban: boolean;
  message_on_warn: boolean;
  message_on_kick: boolean;
  message_on_ban: boolean;
  message_channel: string;
  warn_message: string;
  kick_message: string;
  ban_message: string;
  alert_on_rejoin: boolean;
  alert_channel: string;

  can_note: boolean;
  can_warn: boolean;
  can_mute: boolean;
  can_kick: boolean;
  can_ban: boolean;
  can_view: boolean;
  can_addcase: boolean;
  can_massban: boolean;
  can_hidecase: boolean;
  can_act_as_other: boolean;
}

export class ModActionsPlugin extends ZeppelinPlugin<IModActionsPluginConfig> {
  public static pluginName = "mod_actions";
  public static dependencies = ["cases", "mutes"];

  protected mutes: GuildMutes;
  protected cases: GuildCases;
  protected serverLogs: GuildLogs;

  protected ignoredEvents: IIgnoredEvent[];

  async onLoad() {
    this.mutes = GuildMutes.getInstance(this.guildId);
    this.cases = GuildCases.getInstance(this.guildId);
    this.serverLogs = new GuildLogs(this.guildId);

    this.ignoredEvents = [];
  }

  getDefaultOptions(): IPluginOptions<IModActionsPluginConfig> {
    return {
      config: {
        dm_on_warn: true,
        dm_on_kick: false,
        dm_on_ban: false,
        message_on_warn: false,
        message_on_kick: false,
        message_on_ban: false,
        message_channel: null,
        warn_message: "You have received a warning on {guildName}: {reason}",
        kick_message: "You have been kicked from {guildName}. Reason given: {reason}",
        ban_message: "You have been banned from {guildName}. Reason given: {reason}",
        alert_on_rejoin: false,
        alert_channel: null,

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
    this.ignoredEvents.splice(this.ignoredEvents.findIndex(info => type === info.type && userId === info.userId), 1);
  }

  formatReasonWithAttachments(reason: string, attachments: Attachment[]) {
    const attachmentUrls = attachments.map(a => a.url);
    return ((reason || "") + " " + attachmentUrls.join(" ")).trim();
  }

  async isBanned(userId): Promise<boolean> {
    const bans = (await this.guild.getBans()) as any;
    return bans.some(b => b.user.id === userId);
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

    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
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

    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
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
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${member.id}\`) joined with ${
          actions.length
        } prior record(s)`,
      );
    }
  }

  @d.event("guildMemberRemove")
  async onGuildMemberRemove(_, member: Member) {
    if (this.isEventIgnored(IgnoredEventType.Kick, member.id)) {
      this.clearIgnoredEvent(IgnoredEventType.Kick, member.id);
      return;
    }

    const kickAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_KICK,
      member.id,
    );

    if (kickAuditLogEntry) {
      const existingCaseForThisEntry = await this.cases.findByAuditLogId(kickAuditLogEntry.id);
      if (existingCaseForThisEntry) {
        logger.warn(
          `Tried to create duplicate case for audit log entry ${kickAuditLogEntry.id}, existing case id ${
            existingCaseForThisEntry.id
          }`,
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
   * Update the specified case (or, if case number is omitted, your latest case) by adding more notes/details to it
   */
  @d.command("update", "<caseNumber:number> [note:string$]", {
    overloads: ["[note:string$]"],
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

    msg.channel.createMessage(successMessage(`Case \`#${theCase.case_number}\` updated`));
  }

  @d.command("note", "<user:string> <note:string$>")
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

    this.sendSuccessMessage(msg.channel, `Note added on **${userName}** (Case #${createdCase.case_number})`);
  }

  @d.command("warn", "<user:string> <reason:string$>", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_warn")
  async warnCmd(msg: Message, args: { user: string; reason: string; mod?: Member }) {
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

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
    }

    const config = this.getConfig();
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    const warnMessage = config.warn_message.replace("{guildName}", this.guild.name).replace("{reason}", reason);

    const userMessageResult = await notifyUser(this.bot, this.guild, memberToWarn.user, warnMessage, {
      useDM: config.dm_on_warn,
      useChannel: config.message_on_warn,
    });

    if (userMessageResult.status === NotifyUserStatus.Failed) {
      const failedMsg = await msg.channel.createMessage("Failed to message the user. Log the warning anyway?");
      const reply = await waitForReaction(this.bot, failedMsg, ["✅", "❌"], msg.author.id);
      failedMsg.delete();
      if (!reply || reply.name === "❌") {
        return;
      }
    }

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      userId: memberToWarn.id,
      modId: mod.id,
      type: CaseTypes.Warn,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
      noteDetails: userMessageResult.status !== NotifyUserStatus.Ignored ? [ucfirst(userMessageResult.text)] : [],
    });

    const messageResultText = userMessageResult.text ? ` (${userMessageResult.text})` : "";

    msg.channel.createMessage(
      successMessage(
        `Warned **${memberToWarn.user.username}#${memberToWarn.user.discriminator}** (Case #${
          createdCase.case_number
        })${messageResultText}`,
      ),
    );

    this.serverLogs.log(LogType.MEMBER_WARN, {
      mod: stripObjectToScalars(mod.user),
      member: stripObjectToScalars(memberToWarn, ["user"]),
    });
  }

  /**
   * The actual function run by both !mute and !forcemute.
   * The only difference between the two commands is in target member validation.
   */
  async actualMuteCmd(user: User | UnknownUser, msg: Message, args: { time?: number; reason?: string; mod: Member }) {
    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    let pp = null;

    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
      pp = msg.author;
    }

    const timeUntilUnmute = args.time && humanizeDuration(args.time);
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    let muteResult: MuteResult;
    const mutesPlugin = this.getPlugin<MutesPlugin>("mutes");

    try {
      muteResult = await mutesPlugin.muteUser(user.id, args.time, reason, {
        modId: mod.id,
        ppId: pp && pp.id,
      });
    } catch (e) {
      logger.error(`Failed to mute user ${user.id}: ${e.stack}`);
      msg.channel.createMessage(errorMessage("Could not mute the user"));
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
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_mute")
  async muteCmd(msg: Message, args: { user: string; time?: number; reason?: string; mod: Member }) {
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
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_mute")
  async forcemuteCmd(msg: Message, args: { user: string; time?: number; reason?: string; mod: Member }) {
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
    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.author;
    let pp = null;

    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for --mod");
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
      msg.channel.createMessage(
        successMessage(
          asSingleLine(`
          Unmuting **${user.username}#${user.discriminator}**
          in ${timeUntilUnmute} (Case #${result.case.case_number})
        `),
        ),
      );
    } else {
      msg.channel.createMessage(
        successMessage(
          asSingleLine(`
          Unmuted **${user.username}#${user.discriminator}**
          (Case #${result.case.case_number})
        `),
        ),
      );
    }
  }

  @d.command("unmute", "<user:string> <time:delay> <reason:string$>", {
    overloads: ["<user:string> <time:delay>", "<user:string> [reason:string$]"],
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_mute")
  async unmuteCmd(msg: Message, args: { user: string; time?: number; reason?: string; mod?: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    // Check if they're muted in the first place
    if (!(await this.mutes.isMuted(args.user))) {
      this.sendErrorMessage(msg.channel, "Cannot unmute: member is not muted");
      return;
    }

    // Find the server member to unmute
    const memberToUnmute = await this.getMember(user.id);

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
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_kick")
  async kickCmd(msg, args: { user: string; reason: string; mod: Member }) {
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

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for --mod");
        return;
      }

      mod = args.mod;
    }

    const config = this.getConfig();
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Attempt to message the user *before* kicking them, as doing it after may not be possible
    let userMessageResult: INotifyUserResult = { status: NotifyUserStatus.Ignored };
    if (args.reason) {
      const kickMessage = await renderTemplate(config.kick_message, {
        guildName: this.guild.name,
        reason,
      });

      userMessageResult = await notifyUser(this.bot, this.guild, memberToKick.user, kickMessage, {
        useDM: config.dm_on_kick,
        useChannel: config.message_on_kick,
        channelId: config.message_channel,
      });
    }

    // Kick the user
    this.serverLogs.ignoreLog(LogType.MEMBER_KICK, memberToKick.id);
    this.ignoreEvent(IgnoredEventType.Kick, memberToKick.id);
    memberToKick.kick(reason);

    // Create a case for this action
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      userId: memberToKick.id,
      modId: mod.id,
      type: CaseTypes.Kick,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
      noteDetails: userMessageResult.status !== NotifyUserStatus.Ignored ? [ucfirst(userMessageResult.text)] : [],
    });

    // Confirm the action to the moderator
    let response = `Kicked **${memberToKick.user.username}#${memberToKick.user.discriminator}** (Case #${
      createdCase.case_number
    })`;

    if (userMessageResult.text) response += ` (${userMessageResult.text})`;
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_KICK, {
      mod: stripObjectToScalars(mod.user),
      user: stripObjectToScalars(memberToKick.user),
    });
  }

  @d.command("ban", "<user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_ban")
  async banCmd(msg, args: { user: string; reason?: string; mod?: Member }) {
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

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for --mod");
        return;
      }

      mod = args.mod;
    }

    const config = this.getConfig();
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Attempt to message the user *before* banning them, as doing it after may not be possible
    let userMessageResult: INotifyUserResult = { status: NotifyUserStatus.Ignored };
    if (reason) {
      const banMessage = await renderTemplate(config.ban_message, {
        guildName: this.guild.name,
        reason,
      });

      userMessageResult = await notifyUser(this.bot, this.guild, memberToBan.user, banMessage, {
        useDM: config.dm_on_ban,
        useChannel: config.message_on_ban,
        channelId: config.message_channel,
      });
    }

    // Ban the user
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, memberToBan.id);
    this.ignoreEvent(IgnoredEventType.Ban, memberToBan.id);
    memberToBan.ban(1, reason);

    // Create a case for this action
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      userId: memberToBan.id,
      modId: mod.id,
      type: CaseTypes.Ban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
      noteDetails: userMessageResult.status !== NotifyUserStatus.Ignored ? [ucfirst(userMessageResult.text)] : [],
    });

    // Confirm the action to the moderator
    let response = `Banned **${memberToBan.user.username}#${memberToBan.user.discriminator}** (Case #${
      createdCase.case_number
    })`;

    if (userMessageResult.text) response += ` (${userMessageResult.text})`;
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_BAN, {
      mod: stripObjectToScalars(mod.user),
      user: stripObjectToScalars(memberToBan.user),
    });
  }

  @d.command("softban", "<user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_ban")
  async softbanCmd(msg, args: { user: string; reason: string; mod?: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    const memberToSoftban = await this.getMember(user.id);

    if (!memberToSoftban) {
      const isBanned = await this.isBanned(user.id);
      if (isBanned) {
        this.sendErrorMessage(msg.channel, `User is already banned`);
      } else {
        this.sendErrorMessage(msg.channel, `User not found on the server`);
      }

      return;
    }

    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, memberToSoftban)) {
      this.sendErrorMessage(msg.channel, "Cannot ban: insufficient permissions");
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for --mod");
        return;
      }

      mod = args.mod;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Softban the user = ban, and immediately unban
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, memberToSoftban.id);
    this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, memberToSoftban.id);
    this.ignoreEvent(IgnoredEventType.Ban, memberToSoftban.id);
    this.ignoreEvent(IgnoredEventType.Unban, memberToSoftban.id);

    await memberToSoftban.ban(1, reason);
    await this.guild.unbanMember(memberToSoftban.id);

    // Create a case for this action
    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const createdCase = await casesPlugin.createCase({
      userId: memberToSoftban.id,
      modId: mod.id,
      type: CaseTypes.Softban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    // Confirm the action to the moderator
    msg.channel.createMessage(
      successMessage(
        `Softbanned **${memberToSoftban.user.username}#${memberToSoftban.user.discriminator}** (Case #${
          createdCase.case_number
        })`,
      ),
    );

    // Log the action
    this.serverLogs.log(LogType.MEMBER_SOFTBAN, {
      mod: stripObjectToScalars(mod.user),
      member: stripObjectToScalars(memberToSoftban, ["user"]),
    });
  }

  @d.command("unban", "<user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_ban")
  async unbanCmd(msg: Message, args: { user: string; reason: string; mod: Member }) {
    const user = await this.resolveUser(args.user);
    if (!user) return this.sendErrorMessage(msg.channel, `User not found`);

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for --mod");
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
    msg.channel.createMessage(successMessage(`Member unbanned (Case #${createdCase.case_number})`));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_UNBAN, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
    });
  }

  @d.command("forceban", "<user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
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

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for --mod");
        return;
      }

      mod = args.mod;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    this.ignoreEvent(IgnoredEventType.Ban, user.id);
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, user.id);

    try {
      await this.guild.banMember(user.id, 1, reason);
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
    msg.channel.createMessage(successMessage(`Member forcebanned (Case #${createdCase.case_number})`));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_FORCEBAN, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
    });
  }

  @d.command("massban", "<userIds:string...>")
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
      const member = this.guild.members.get(userId);
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
        await this.guild.banMember(userId);

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
      });

      if (failedBans.length) {
        msg.channel.createMessage(
          successMessage(`Banned ${successfulBanCount} users, ${failedBans.length} failed: ${failedBans.join(" ")}`),
        );
      } else {
        msg.channel.createMessage(successMessage(`Banned ${successfulBanCount} users successfully`));
      }
    }
  }

  @d.command("addcase", "<type:string> <user:string> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
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

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        this.sendErrorMessage(msg.channel, "No permission for --mod");
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
      msg.channel.createMessage(
        successMessage(`Case #${theCase.case_number} created for **${user.username}#${user.discriminator}**`),
      );
    } else {
      msg.channel.createMessage(successMessage(`Case #${theCase.case_number} created`));
    }

    // Log the action
    this.serverLogs.log(LogType.CASE_CREATE, {
      mod: stripObjectToScalars(mod.user),
      userId: user.id,
      caseNum: theCase.case_number,
      caseType: type.toUpperCase(),
    });
  }

  /**
   * Display a case or list of cases
   * If the argument passed is a case id, display that case
   * If the argument passed is a user id, show all cases on that user
   */
  @d.command("case", "<caseNumber:number>")
  @d.permission("can_view")
  async showCaseCmd(msg: Message, args: { caseNumber: number }) {
    // Assume case id
    const theCase = await this.cases.findByCaseNumber(args.caseNumber);

    if (!theCase) {
      this.sendErrorMessage(msg.channel, "Case not found");
      return;
    }

    const casesPlugin = this.getPlugin<CasesPlugin>("cases");
    const embed = await casesPlugin.getCaseEmbed(theCase.id);
    msg.channel.createMessage(embed);
  }

  @d.command("cases", "<user:string> [opts:string$]", {
    options: [
      {
        name: "expand",
        type: "boolean",
        shortcut: "e",
      },
      {
        name: "hidden",
        type: "boolean",
        shortcut: "h",
      },
    ],
  })
  @d.permission("can_view")
  async userCasesCmd(msg: Message, args: { user: string; opts?: string; expand?: boolean; hidden?: boolean }) {
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
      const showHidden = args.hidden || (args.opts && args.opts.match(/\bhidden\b/));
      const casesToDisplay = showHidden ? cases : normalCases;

      if (args.expand || (args.opts && args.opts.match(/\b(expand|e)\b/))) {
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

        if (!showHidden && hiddenCases.length) {
          if (hiddenCases.length === 1) {
            lines.push(`*+${hiddenCases.length} hidden case, use "--hidden" to show it*`);
          } else {
            lines.push(`*+${hiddenCases.length} hidden cases, use "--hidden" to show them*`);
          }
        }

        const finalMessage = trimLines(`
        Cases for **${userName}**:

        ${lines.join("\n")}

        Use the \`case <num>\` command to see more info about individual cases
      `);

        createChunkedMessage(msg.channel, finalMessage);
      }

      if ((args.opts && args.opts.match(/\bhidden\b/)) || (args.opts && args.opts.match(/\b(expand|e)\b/))) {
        msg.channel.createMessage(
          `<@!${
            msg.author.id
          }> **Note:** expand/hidden have been replaced with --expand/--hidden (and -e/-h as shortcuts)`,
        );
      }
    }
  }

  @d.command("cases", null, {
    options: [{ name: "mod", type: "Member" }],
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

  @d.command("hidecase", "<caseNum:number>")
  @d.permission("can_hidecase")
  async hideCaseCmd(msg: Message, args: { caseNum: number }) {
    const theCase = await this.cases.findByCaseNumber(args.caseNum);
    if (!theCase) {
      this.sendErrorMessage(msg.channel, "Case not found!");
      return;
    }

    await this.cases.setHidden(theCase.id, true);
    msg.channel.createMessage(
      successMessage(`Case #${theCase.case_number} is now hidden! Use \`unhidecase\` to unhide it.`),
    );
  }

  @d.command("unhidecase", "<caseNum:number>")
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
