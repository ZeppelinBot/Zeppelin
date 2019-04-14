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
  notifyUser,
  NotifyUserStatus,
  stripObjectToScalars,
  successMessage,
  trimLines,
  ucfirst,
  unknownUser,
} from "../utils";
import { GuildMutes } from "../data/GuildMutes";
import { CaseTypes } from "../data/CaseTypes";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildActions, MuteActionResult } from "../data/GuildActions";
import { Case } from "../data/entities/Case";
import { renderTemplate } from "../templateFormatter";

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

  protected actions: GuildActions;
  protected mutes: GuildMutes;
  protected cases: GuildCases;
  protected serverLogs: GuildLogs;

  protected ignoredEvents: IIgnoredEvent[];

  async onLoad() {
    this.actions = GuildActions.getInstance(this.guildId);
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

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      this.actions.fire("createCase", {
        userId: user.id,
        modId,
        type: CaseTypes.Ban,
        auditLogId,
        reason: relevantAuditLogEntry.reason,
        automatic: true,
      });
    } else {
      this.actions.fire("createCase", {
        userId: user.id,
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

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      this.actions.fire("createCase", {
        userId: user.id,
        modId,
        type: CaseTypes.Unban,
        auditLogId,
        automatic: true,
      });
    } else {
      this.actions.fire("createCase", {
        userId: user.id,
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
        this.actions.fire("createCase", {
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
  @d.command("update", "<caseNumber:number> <note:string$>", {
    overloads: ["<note:string$>"],
  })
  @d.permission("can_note")
  async updateCmd(msg: Message, args: { caseNumber?: number; note: string }) {
    let theCase: Case;
    if (args.caseNumber != null) {
      theCase = await this.cases.findByCaseNumber(args.caseNumber);
    } else {
      theCase = await this.cases.findLatestByModId(msg.author.id);
    }

    if (!theCase) {
      msg.channel.createMessage(errorMessage("Case not found"));
      return;
    }

    await this.actions.fire("createCaseNote", {
      caseId: theCase.id,
      modId: msg.author.id,
      note: args.note,
    });

    this.serverLogs.log(LogType.CASE_UPDATE, {
      mod: msg.author,
      caseNumber: theCase.case_number,
      caseType: CaseTypes[theCase.type],
      note: args.note,
    });

    msg.channel.createMessage(successMessage(`Case \`#${theCase.case_number}\` updated`));
  }

  @d.command("note", "<userId:userId> <note:string$>")
  @d.permission("can_note")
  async noteCmd(msg: Message, args: any) {
    const user = await this.bot.users.get(args.userId);
    const userName = user ? `${user.username}#${user.discriminator}` : "member";
    const reason = this.formatReasonWithAttachments(args.note, msg.attachments);

    const createdCase = await this.actions.fire("createCase", {
      userId: args.userId,
      modId: msg.author.id,
      type: CaseTypes.Note,
      reason,
    });

    msg.channel.createMessage(successMessage(`Note added on **${userName}** (Case #${createdCase.case_number})`));
  }

  @d.command("warn", "<member:Member> <reason:string$>", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_warn")
  async warnCmd(msg: Message, args: any) {
    // Make sure we're allowed to warn this member
    if (!this.canActOn(msg.member, args.member)) {
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

    const userMessageResult = await notifyUser(this.bot, this.guild, args.member.user, warnMessage, {
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

    const createdCase: Case = await this.actions.fire("createCase", {
      userId: args.member.id,
      modId: mod.id,
      type: CaseTypes.Warn,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
      noteDetails: userMessageResult.status !== NotifyUserStatus.Ignored ? [ucfirst(userMessageResult.text)] : [],
    });

    const messageResultText = userMessageResult.text ? ` (${userMessageResult.text})` : "";

    msg.channel.createMessage(
      successMessage(
        `Warned **${args.member.user.username}#${args.member.user.discriminator}** (Case #${
          createdCase.case_number
        })${messageResultText}`,
      ),
    );

    this.serverLogs.log(LogType.MEMBER_WARN, {
      mod: stripObjectToScalars(mod.user),
      member: stripObjectToScalars(args.member, ["user"]),
    });
  }

  @d.command("mute", "<member:Member> <time:delay> <reason:string$>", {
    overloads: ["<member:Member> <time:delay>", "<member:Member> [reason:string$]"],
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_mute")
  async muteCmd(msg: Message, args: { member: Member; time?: number; reason?: string; mod: Member }) {
    // Make sure we're allowed to mute this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot mute: insufficient permissions"));
      return;
    }

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

    let muteResult: MuteActionResult;

    try {
      muteResult = await this.actions.fire("mute", {
        member: args.member,
        muteTime: args.time,
        reason,
        caseDetails: {
          modId: mod.id,
          ppId: pp && pp.id,
        },
      });
    } catch (e) {
      logger.error(`Failed to mute user ${args.member.id}: ${e.message}`);
      msg.channel.createMessage(errorMessage("Could not mute the user"));
      return;
    }

    // Confirm the action to the moderator
    let response;
    if (args.time) {
      if (muteResult.updatedExistingMute) {
        response = asSingleLine(`
          Updated **${args.member.user.username}#${args.member.user.discriminator}**'s
          mute to ${timeUntilUnmute} (Case #${muteResult.case.case_number})
        `);
      } else {
        response = asSingleLine(`
          Muted **${args.member.user.username}#${args.member.user.discriminator}**
          for ${timeUntilUnmute} (Case #${muteResult.case.case_number})
        `);
      }
    } else {
      if (muteResult.updatedExistingMute) {
        response = asSingleLine(`
          Updated **${args.member.user.username}#${args.member.user.discriminator}**'s
          mute to indefinite (Case #${muteResult.case.case_number})
        `);
      } else {
        response = asSingleLine(`
          Muted **${args.member.user.username}#${args.member.user.discriminator}**
          indefinitely (Case #${muteResult.case.case_number})
        `);
      }
    }

    if (muteResult.notifyResult.text) response += ` (${muteResult.notifyResult.text})`;
    msg.channel.createMessage(successMessage(response));
  }

  @d.command("unmute", "<member:Member> <time:delay> <reason:string$>", {
    overloads: ["<member:Member> <time:delay>", "<member:Member> [reason:string$]"],
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_mute")
  async unmuteCmd(msg: Message, args: { member: Member; time?: number; reason?: string; mod?: Member }) {
    // Make sure we're allowed to mute this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot unmute: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.author;
    let pp = null;

    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod.user;
      pp = msg.author;
    }

    // Check if they're muted in the first place
    if (!(await this.mutes.isMuted(args.member.id))) {
      msg.channel.createMessage(errorMessage("Cannot unmute: member is not muted"));
      return;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    const result = await this.actions.fire("unmute", {
      member: args.member,
      unmuteTime: args.time,
      caseDetails: {
        modId: mod.id,
        ppId: pp && pp.id,
        reason,
      },
    });

    // Confirm the action to the moderator
    if (args.time) {
      const timeUntilUnmute = args.time && humanizeDuration(args.time);
      msg.channel.createMessage(
        successMessage(
          asSingleLine(`
          Unmuting **${args.member.user.username}#${args.member.user.discriminator}**
          in ${timeUntilUnmute} (Case #${result.case.case_number})
        `),
        ),
      );
    } else {
      msg.channel.createMessage(
        successMessage(
          asSingleLine(`
          Unmuted **${args.member.user.username}#${args.member.user.discriminator}**
          (Case #${result.case.case_number})
        `),
        ),
      );
    }
  }

  @d.command("kick", "<member:Member> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_kick")
  async kickCmd(msg, args: { member: Member; reason: string; mod: Member }) {
    // Make sure we're allowed to kick this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot kick: insufficient permissions"));
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

    // Attempt to message the user *before* kicking them, as doing it after may not be possible
    let userMessageResult: INotifyUserResult = { status: NotifyUserStatus.Ignored };
    if (args.reason) {
      const kickMessage = await renderTemplate(config.kick_message, {
        guildName: this.guild.name,
        reason,
      });

      userMessageResult = await notifyUser(this.bot, this.guild, args.member.user, kickMessage, {
        useDM: config.dm_on_kick,
        useChannel: config.message_on_kick,
        channelId: config.message_channel,
      });
    }

    // Kick the user
    this.serverLogs.ignoreLog(LogType.MEMBER_KICK, args.member.id);
    this.ignoreEvent(IgnoredEventType.Kick, args.member.id);
    args.member.kick(reason);

    // Create a case for this action
    const createdCase = await this.actions.fire("createCase", {
      userId: args.member.id,
      modId: mod.id,
      type: CaseTypes.Kick,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
      noteDetails: userMessageResult.status !== NotifyUserStatus.Ignored ? [ucfirst(userMessageResult.text)] : [],
    });

    // Confirm the action to the moderator
    let response = `Kicked **${args.member.user.username}#${args.member.user.discriminator}** (Case #${
      createdCase.case_number
    })`;

    if (userMessageResult.text) response += ` (${userMessageResult.text})`;
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_KICK, {
      mod: stripObjectToScalars(mod.user),
      user: stripObjectToScalars(args.member.user),
    });
  }

  @d.command("ban", "<member:Member> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_ban")
  async banCmd(msg, args: { member: Member; reason?: string; mod?: Member }) {
    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot ban: insufficient permissions"));
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

    // Attempt to message the user *before* banning them, as doing it after may not be possible
    let userMessageResult: INotifyUserResult = { status: NotifyUserStatus.Ignored };
    if (reason) {
      const banMessage = await renderTemplate(config.ban_message, {
        guildName: this.guild.name,
        reason,
      });

      userMessageResult = await notifyUser(this.bot, this.guild, args.member.user, banMessage, {
        useDM: config.dm_on_ban,
        useChannel: config.message_on_ban,
        channelId: config.message_channel,
      });
    }

    // Ban the user
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, args.member.id);
    this.ignoreEvent(IgnoredEventType.Ban, args.member.id);
    args.member.ban(1, reason);

    // Create a case for this action
    const createdCase = await this.actions.fire("createCase", {
      userId: args.member.id,
      modId: mod.id,
      type: CaseTypes.Ban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
      noteDetails: userMessageResult.status !== NotifyUserStatus.Ignored ? [ucfirst(userMessageResult.text)] : [],
    });

    // Confirm the action to the moderator
    let response = `Banned **${args.member.user.username}#${args.member.user.discriminator}** (Case #${
      createdCase.case_number
    })`;

    if (userMessageResult.text) response += ` (${userMessageResult.text})`;
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_BAN, {
      mod: stripObjectToScalars(mod.user),
      user: stripObjectToScalars(args.member.user),
    });
  }

  @d.command("softban", "<member:Member> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_ban")
  async softbanCmd(msg, args) {
    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot ban: insufficient permissions"));
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

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Softban the user = ban, and immediately unban
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, args.member.id);
    this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, args.member.id);
    this.ignoreEvent(IgnoredEventType.Ban, args.member.id);
    this.ignoreEvent(IgnoredEventType.Unban, args.member.id);

    await args.member.ban(1, reason);
    await this.guild.unbanMember(args.member.id);

    // Create a case for this action
    const createdCase = await this.actions.fire("createCase", {
      userId: args.member.id,
      modId: mod.id,
      type: CaseTypes.Softban,
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    // Confirm the action to the moderator
    msg.channel.createMessage(
      successMessage(
        `Softbanned **${args.member.user.username}#${args.member.user.discriminator}** (Case #${
          createdCase.case_number
        })`,
      ),
    );

    // Log the action
    this.serverLogs.log(LogType.MEMBER_SOFTBAN, {
      mod: stripObjectToScalars(mod.user),
      member: stripObjectToScalars(args.member, ["user"]),
    });
  }

  @d.command("unban", "<userId:userId> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_ban")
  async unbanCmd(msg: Message, args: { userId: string; reason: string; mod: Member }) {
    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("can_act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
    }

    this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, args.userId);

    try {
      this.ignoreEvent(IgnoredEventType.Unban, args.userId);
      await this.guild.unbanMember(args.userId);
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to unban member; are you sure they're banned?"));
      return;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Create a case
    const createdCase = await this.actions.fire("createCase", {
      userId: args.userId,
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
      userId: args.userId,
    });
  }

  @d.command("forceban", "<userId:userId> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_ban")
  async forcebanCmd(msg: Message, args: any) {
    // If the user exists as a guild member, make sure we can act on them first
    const member = this.guild.members.get(args.userId);
    if (member && !this.canActOn(msg.member, member)) {
      msg.channel.createMessage(errorMessage("Cannot forceban this user: insufficient permissions"));
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

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    this.ignoreEvent(IgnoredEventType.Ban, args.userId);
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, args.userId);

    try {
      await this.guild.banMember(args.userId, 1, reason);
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to forceban member"));
      return;
    }

    // Create a case
    const createdCase = await this.actions.fire("createCase", {
      userId: args.userId,
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
      userId: args.userId,
    });
  }

  @d.command("massban", "<userIds:string...>")
  @d.permission("can_massban")
  async massbanCmd(msg: Message, args: { userIds: string[] }) {
    // Limit to 100 users at once (arbitrary?)
    if (args.userIds.length > 100) {
      msg.channel.createMessage(errorMessage(`Can only massban max 100 users at once`));
      return;
    }

    // Ask for ban reason (cleaner this way instead of trying to cram it into the args)
    msg.channel.createMessage("Ban reason? `cancel` to cancel");
    const banReasonReply = await waitForReply(this.bot, msg.channel as TextChannel, msg.author.id);
    if (!banReasonReply || !banReasonReply.content || banReasonReply.content.toLowerCase().trim() === "cancel") {
      msg.channel.createMessage("Cancelled");
      return;
    }

    const banReason = this.formatReasonWithAttachments(banReasonReply.content, msg.attachments);

    // Verify we can act on each of the users specified
    for (const userId of args.userIds) {
      const member = this.guild.members.get(userId);
      if (member && !this.canActOn(msg.member, member)) {
        msg.channel.createMessage(errorMessage("Cannot massban one or more users: insufficient permissions"));
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
    for (const userId of args.userIds) {
      try {
        await this.guild.banMember(userId);

        await this.actions.fire("createCase", {
          userId,
          modId: msg.author.id,
          type: CaseTypes.Ban,
          reason: `Mass ban: ${banReason}`,
          postInCaseLog: false,
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
      msg.channel.createMessage(errorMessage("All bans failed. Make sure the IDs are valid."));
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

  @d.command("addcase", "<type:string> <target:userId> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("can_addcase")
  async addcaseCmd(msg: Message, args: { type: string; target: string; reason?: string; mod?: Member }) {
    // Verify the user id is a valid snowflake-ish
    if (!args.target.match(/^[0-9]{17,20}$/)) {
      msg.channel.createMessage(errorMessage("Cannot add case: invalid user id"));
      return;
    }

    // If the user exists as a guild member, make sure we can act on them first
    const member = this.guild.members.get(args.target);
    if (member && !this.canActOn(msg.member, member)) {
      msg.channel.createMessage(errorMessage("Cannot add case on this user: insufficient permissions"));
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

    // Verify the case type is valid
    const type: string = args.type[0].toUpperCase() + args.type.slice(1).toLowerCase();
    if (!CaseTypes[type]) {
      msg.channel.createMessage(errorMessage("Cannot add case: invalid case type"));
      return;
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Create the case
    const theCase: Case = await this.actions.fire("createCase", {
      userId: args.target,
      modId: mod.id,
      type: CaseTypes[type],
      reason,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    const user = member ? member.user : this.bot.users.get(args.target);
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
      userId: args.target,
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
      msg.channel.createMessage(errorMessage("Case not found"));
      return;
    }

    await this.actions.fire("postCase", {
      caseId: theCase.id,
      channel: msg.channel,
    });
  }

  @d.command("cases", "<userId:userId> [opts:string$]", {
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
  async userCasesCmd(msg: Message, args: { userId: string; opts?: string; expand?: boolean; hidden?: boolean }) {
    const cases = await this.cases.with("notes").getByUserId(args.userId);
    const normalCases = cases.filter(c => !c.is_hidden);
    const hiddenCases = cases.filter(c => c.is_hidden);

    const user = this.bot.users.get(args.userId) || unknownUser;
    const userName = `${user.username}#${user.discriminator}`;

    if (cases.length === 0) {
      msg.channel.createMessage(`No cases found for ${user ? `**${userName}**` : "the specified user"}`);
    } else {
      const showHidden = args.hidden || (args.opts && args.opts.match(/\bhidden\b/));
      const casesToDisplay = showHidden ? cases : normalCases;

      if (args.expand || (args.opts && args.opts.match(/\b(expand|e)\b/))) {
        if (casesToDisplay.length > 8) {
          msg.channel.createMessage("Too many cases for expanded view. Please use compact view instead.");
          return;
        }

        // Expanded view (= individual case embeds)
        for (const theCase of casesToDisplay) {
          await this.actions.fire("postCase", {
            caseId: theCase.id,
            channel: msg.channel,
          });
        }
      } else {
        // Compact view (= regular message with a preview of each case)
        const lines = [];
        for (const theCase of casesToDisplay) {
          theCase.notes.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
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
      msg.channel.createMessage(errorMessage("Case not found!"));
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
      msg.channel.createMessage(errorMessage("Case not found!"));
      return;
    }

    await this.cases.setHidden(theCase.id, false);
    msg.channel.createMessage(successMessage(`Case #${theCase.case_number} is no longer hidden!`));
  }
}
