import { decorators as d, IPluginOptions, waitForReaction, waitForReply } from "knub";
import { Attachment, Constants as ErisConstants, Guild, Member, Message, TextChannel, User } from "eris";
import humanizeDuration from "humanize-duration";
import { GuildCases } from "../data/GuildCases";
import {
  convertDelayStringToMS,
  createChunkedMessage,
  errorMessage,
  findRelevantAuditLogEntry,
  formatTemplateString,
  asSingleLine,
  stripObjectToScalars,
  successMessage,
  trimLines,
} from "../utils";
import { GuildMutes } from "../data/GuildMutes";
import { CaseTypes } from "../data/CaseTypes";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import Timer = NodeJS.Timer;
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildActions } from "../data/GuildActions";
import { Case } from "../data/entities/Case";
import { Mute } from "../data/entities/Mute";

enum IgnoredEventType {
  Ban = 1,
  Unban,
  Kick,
}

interface IIgnoredEvent {
  type: IgnoredEventType;
  userId: string;
}

enum MessageResultStatus {
  Ignored = 1,
  Failed,
  DirectMessaged,
  ChannelMessaged,
}

interface IMessageResult {
  status: MessageResultStatus;
  text?: string;
}

interface IModActionsPluginConfig {
  dm_on_warn: boolean;
  dm_on_mute: boolean;
  dm_on_kick: boolean;
  dm_on_ban: boolean;
  message_on_warn: boolean;
  message_on_mute: boolean;
  message_on_kick: boolean;
  message_on_ban: boolean;
  message_channel: string;
  warn_message: string;
  mute_message: string;
  timed_mute_message: string;
  kick_message: string;
  ban_message: string;
  alert_on_rejoin: boolean;
  alert_channel: string;
}

interface IModActionsPluginPermissions {
  note: boolean;
  warn: boolean;
  mute: boolean;
  kick: boolean;
  ban: boolean;
  view: boolean;
  addcase: boolean;
  massban: boolean;
  hidecase: boolean;
  act_as_other: boolean;
}

export class ModActionsPlugin extends ZeppelinPlugin<IModActionsPluginConfig, IModActionsPluginPermissions> {
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

  getDefaultOptions(): IPluginOptions<IModActionsPluginConfig, IModActionsPluginPermissions> {
    return {
      config: {
        dm_on_warn: true,
        dm_on_mute: false,
        dm_on_kick: false,
        dm_on_ban: false,
        message_on_warn: false,
        message_on_mute: false,
        message_on_kick: false,
        message_on_ban: false,
        message_channel: null,
        warn_message: "You have received a warning on {guildName}: {reason}",
        mute_message: "You have been muted on {guildName}. Reason given: {reason}",
        timed_mute_message: "You have been muted on {guildName} for {time}. Reason given: {reason}",
        kick_message: "You have been kicked from {guildName}. Reason given: {reason}",
        ban_message: "You have been banned from {guildName}. Reason given: {reason}",
        alert_on_rejoin: false,
        alert_channel: null,
      },
      permissions: {
        note: false,
        warn: false,
        mute: false,
        kick: false,
        ban: false,
        view: false,
        addcase: false,
        massban: false,
        hidecase: false,
        act_as_other: false,
      },
      overrides: [
        {
          level: ">=50",
          permissions: {
            note: true,
            warn: true,
            mute: true,
            kick: true,
            ban: true,
            view: true,
            addcase: true,
          },
        },
        {
          level: ">=100",
          permissions: {
            massban: true,
            hidecase: true,
            act_as_other: true,
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
      this.actions.fire("createCase", {
        userId: member.id,
        modId: kickAuditLogEntry.user.id,
        type: CaseTypes.Kick,
        auditLogId: kickAuditLogEntry.id,
        reason: kickAuditLogEntry.reason,
        automatic: true,
      });

      this.serverLogs.log(LogType.MEMBER_KICK, {
        user: stripObjectToScalars(member.user),
        mod: stripObjectToScalars(kickAuditLogEntry.user),
      });
    }
  }

  /**
   * Update the specified case by adding more notes/details to it
   */
  @d.command(/update|updatecase/, "<caseNumber:number> <note:string$>")
  @d.permission("note")
  async updateSpecificCmd(msg: Message, args: { caseNumber: number; note: string }) {
    const theCase = await this.cases.findByCaseNumber(args.caseNumber);
    if (!theCase) {
      msg.channel.createMessage(errorMessage("Case not found"));
      return;
    }

    await this.actions.fire("createCaseNote", {
      caseId: theCase.id,
      modId: msg.author.id,
      note: args.note,
    });

    msg.channel.createMessage(successMessage(`Case \`#${theCase.case_number}\` updated`));
  }

  /**
   * Update the latest case
   */
  @d.command(/update|updatecase/, "<note:string$>")
  @d.permission("note")
  async updateLatestCmd(msg: Message, args: { note: string }) {
    const theCase = await this.cases.findLatestByModId(msg.author.id);
    if (!theCase) {
      msg.channel.createMessage(errorMessage("No latest case"));
      return;
    }

    await this.actions.fire("createCaseNote", {
      caseId: theCase.id,
      modId: msg.author.id,
      note: args.note,
    });

    msg.channel.createMessage(successMessage(`Case \`#${theCase.case_number}\` updated`));
  }

  @d.command("note", "<userId:userId> <note:string$>")
  @d.permission("note")
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
  @d.permission("warn")
  async warnCmd(msg: Message, args: any) {
    // Make sure we're allowed to warn this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot warn: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
    }

    const config = this.getConfig();
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    const warnMessage = config.warn_message.replace("{guildName}", this.guild.name).replace("{reason}", reason);

    const userMessageResult = await this.tryToMessageUser(
      args.member.user,
      warnMessage,
      config.dm_on_warn,
      config.message_on_warn,
    );

    if (userMessageResult.status === MessageResultStatus.Failed) {
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

  @d.command("mute", "<member:Member> [time:string] [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("mute")
  async muteCmd(msg: Message, args: { member: Member; time: string; reason: string; mod: Member }) {
    // Make sure we're allowed to mute this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot mute: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
    }

    let userMessageResult: IMessageResult = { status: MessageResultStatus.Ignored };

    // Convert mute time from e.g. "2h30m" to milliseconds
    const muteTime = args.time ? convertDelayStringToMS(args.time) : null;
    const timeUntilUnmute = muteTime && humanizeDuration(muteTime);

    if (muteTime == null && args.time) {
      // Invalid muteTime -> assume it's actually part of the reason
      args.reason = `${args.time} ${args.reason ? args.reason : ""}`.trim();
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Apply "muted" role
    this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_ADD, args.member.id);
    const mute: Mute = await this.actions.fire("mute", {
      member: args.member,
      muteTime,
    });

    if (!mute) {
      msg.channel.createMessage(errorMessage("Could not mute the user"));
      return;
    }

    const hasOldCase = mute.case_id != null;

    let theCase;

    if (hasOldCase) {
      // Update old case
      theCase = await this.cases.find(mute.case_id);
      const caseNote = `__[Mute updated to ${muteTime ? timeUntilUnmute : "indefinite"}]__ ${reason}`.trim();
      await this.actions.fire("createCaseNote", {
        caseId: mute.case_id,
        modId: mod.id,
        note: caseNote,
      });
    } else {
      // Create new case
      const caseNote = `__[Muted ${muteTime ? `for ${timeUntilUnmute}` : "indefinitely"}]__ ${reason}`.trim();
      theCase = await this.actions.fire("createCase", {
        userId: args.member.id,
        modId: mod.id,
        type: CaseTypes.Mute,
        reason: caseNote,
        ppId: mod.id !== msg.author.id ? msg.author.id : null,
      });
      await this.mutes.setCaseId(args.member.id, theCase.id);
    }

    const config = this.getConfig();

    // Message the user informing them of the mute
    // Don't message them if we're updating an old mute
    if (reason && !hasOldCase) {
      const template = muteTime ? config.timed_mute_message : config.mute_message;

      const muteMessage = formatTemplateString(template, {
        guildName: this.guild.name,
        reason,
        time: timeUntilUnmute,
      });

      userMessageResult = await this.tryToMessageUser(
        args.member.user,
        muteMessage,
        config.dm_on_mute,
        config.message_on_mute,
      );
    }

    // Confirm the action to the moderator
    let response;
    if (muteTime) {
      if (hasOldCase) {
        response = asSingleLine(`
          Updated **${args.member.user.username}#${args.member.user.discriminator}**'s
          mute to ${timeUntilUnmute} (Case #${theCase.case_number})
        `);
      } else {
        response = asSingleLine(`
          Muted **${args.member.user.username}#${args.member.user.discriminator}**
          for ${timeUntilUnmute} (Case #${theCase.case_number})
        `);
      }
    } else {
      if (hasOldCase) {
        response = asSingleLine(`
          Updated **${args.member.user.username}#${args.member.user.discriminator}**'s
          mute to indefinite (Case #${theCase.case_number})
        `);
      } else {
        response = asSingleLine(`
          Muted **${args.member.user.username}#${args.member.user.discriminator}**
          indefinitely (Case #${theCase.case_number})
        `);
      }
    }

    if (userMessageResult.text) response += ` (${userMessageResult.text})`;
    msg.channel.createMessage(successMessage(response));

    // Log the action
    if (muteTime) {
      this.serverLogs.log(LogType.MEMBER_TIMED_MUTE, {
        mod: stripObjectToScalars(mod.user),
        member: stripObjectToScalars(args.member, ["user"]),
        time: timeUntilUnmute,
      });
    } else {
      this.serverLogs.log(LogType.MEMBER_MUTE, {
        mod: stripObjectToScalars(mod.user),
        member: stripObjectToScalars(args.member, ["user"]),
      });
    }
  }

  @d.command("unmute", "<member:Member> [time:string] [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("mute")
  async unmuteCmd(msg: Message, args: any) {
    // Make sure we're allowed to mute this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot unmute: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
    }

    // Check if they're muted in the first place
    const mute = await this.mutes.findExistingMuteForUserId(args.member.id);
    if (!mute) {
      msg.channel.createMessage(errorMessage("Cannot unmute: member is not muted"));
      return;
    }

    // Convert unmute time from e.g. "2h30m" to milliseconds
    const unmuteTime = args.time ? convertDelayStringToMS(args.time) : null;
    const timeUntilUnmute = unmuteTime && humanizeDuration(unmuteTime);

    if (unmuteTime == null && args.time) {
      // Invalid unmuteTime -> assume it's actually part of the reason
      args.reason = `${args.time} ${args.reason ? args.reason : ""}`.trim();
    }

    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);
    const caseNote = unmuteTime ? `__[Scheduled unmute in ${timeUntilUnmute}]__ ${reason}` : reason;

    // Create a case
    const createdCase = await this.actions.fire("createCase", {
      userId: args.member.id,
      modId: mod.id,
      type: CaseTypes.Unmute,
      reason: caseNote,
      ppId: mod.id !== msg.author.id ? msg.author.id : null,
    });

    if (unmuteTime) {
      // If we have an unmute time, just update the old mute to expire in that time
      await this.actions.fire("unmute", { member: args.member, unmuteTime });

      // Confirm the action to the moderator
      msg.channel.createMessage(
        successMessage(
          `Unmuting **${args.member.user.username}#${args.member.user.discriminator}** in ${timeUntilUnmute} (Case #${
            createdCase.case_number
          })`,
        ),
      );

      // Log the action
      this.serverLogs.log(LogType.MEMBER_TIMED_UNMUTE, {
        mod: stripObjectToScalars(mod.user),
        member: stripObjectToScalars(args.member, ["user"]),
        time: timeUntilUnmute,
      });
    } else {
      // Otherwise remove "muted" role immediately
      this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, args.member.id);
      await this.actions.fire("unmute", { member: args.member });

      // Confirm the action to the moderator
      msg.channel.createMessage(
        successMessage(
          `Unmuted **${args.member.user.username}#${args.member.user.discriminator}** (Case #${
            createdCase.case_number
          })`,
        ),
      );

      // Log the action
      this.serverLogs.log(LogType.MEMBER_UNMUTE, {
        mod: stripObjectToScalars(msg.member.user),
        member: stripObjectToScalars(args.member, ["user"]),
      });
    }
  }

  @d.command("kick", "<member:Member> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("kick")
  async kickCmd(msg, args: { member: Member; reason: string; mod: Member }) {
    // Make sure we're allowed to kick this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot kick: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
    }

    const config = this.getConfig();
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Attempt to message the user *before* kicking them, as doing it after may not be possible
    let userMessageResult: IMessageResult = { status: MessageResultStatus.Ignored };
    if (args.reason) {
      const kickMessage = formatTemplateString(config.kick_message, {
        guildName: this.guild.name,
        reason,
      });

      userMessageResult = await this.tryToMessageUser(
        args.member.user,
        kickMessage,
        config.dm_on_kick,
        config.message_on_kick,
      );
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
  @d.permission("ban")
  async banCmd(msg, args: { member: Member; reason?: string; mod?: Member }) {
    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot ban: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("act_as_other", { message: msg })) {
        msg.channel.createMessage(errorMessage("No permission for --mod"));
        return;
      }

      mod = args.mod;
    }

    const config = this.getConfig();
    const reason = this.formatReasonWithAttachments(args.reason, msg.attachments);

    // Attempt to message the user *before* banning them, as doing it after may not be possible
    let userMessageResult: IMessageResult = { status: MessageResultStatus.Ignored };
    if (reason) {
      const banMessage = formatTemplateString(config.ban_message, {
        guildName: this.guild.name,
        reason,
      });

      userMessageResult = await this.tryToMessageUser(
        args.member.user,
        banMessage,
        config.dm_on_ban,
        config.message_on_ban,
      );
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
      member: stripObjectToScalars(args.member, ["user"]),
    });
  }

  @d.command("softban", "<member:Member> [reason:string$]", {
    options: [{ name: "mod", type: "member" }],
  })
  @d.permission("ban")
  async softbanCmd(msg, args) {
    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot ban: insufficient permissions"));
      return;
    }

    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("act_as_other", { message: msg })) {
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
  @d.permission("ban")
  async unbanCmd(msg: Message, args: { userId: string; reason: string; mod: Member }) {
    // The moderator who did the action is the message author or, if used, the specified --mod
    let mod = msg.member;
    if (args.mod) {
      if (!this.hasPermission("act_as_other", { message: msg })) {
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
      msg.channel.createMessage(errorMessage("Failed to unban member"));
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
  @d.permission("ban")
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
      if (!this.hasPermission("act_as_other", { message: msg })) {
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
  @d.permission("massban")
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
  @d.permission("addcase")
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
      if (!this.hasPermission("act_as_other", { message: msg })) {
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
  @d.permission("view")
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

  @d.command("cases", "<userId:userId> [opts:string$]")
  @d.permission("view")
  async userCasesCmd(msg: Message, args: { userId: string; opts?: string }) {
    const cases = await this.cases.with("notes").getByUserId(args.userId);
    const normalCases = cases.filter(c => !c.is_hidden);
    const hiddenCases = cases.filter(c => c.is_hidden);

    const user = this.bot.users.get(args.userId);
    const userName = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";

    if (cases.length === 0) {
      msg.channel.createMessage(`No cases found for ${user ? `**${userName}**` : "the specified user"}`);
    } else {
      const showHidden = args.opts && args.opts.match(/\bhidden\b/);
      const casesToDisplay = showHidden ? cases : normalCases;

      if (args.opts && (args.opts.match(/\bexpand\b/) || args.opts.match(/\be\b/))) {
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
            lines.push(`*+${hiddenCases.length} hidden case, use "hidden" to show it*`);
          } else {
            lines.push(`*+${hiddenCases.length} hidden cases, use "hidden" to show them*`);
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
  })
  @d.permission("view")
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
  @d.permission("hidecase")
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
  @d.permission("hidecase")
  async unhideCaseCmd(msg: Message, args: { caseNum: number }) {
    const theCase = await this.cases.findByCaseNumber(args.caseNum);
    if (!theCase) {
      msg.channel.createMessage(errorMessage("Case not found!"));
      return;
    }

    await this.cases.setHidden(theCase.id, false);
    msg.channel.createMessage(successMessage(`Case #${theCase.case_number} is no longer hidden!`));
  }

  /**
   * Attempts to message the specified user through DMs and/or the message channel.
   * Returns a promise that resolves to a status constant indicating the result.
   */
  protected async tryToMessageUser(
    user: User,
    str: string,
    useDM: boolean,
    useChannel: boolean,
  ): Promise<IMessageResult> {
    if (!useDM && !useChannel) {
      return { status: MessageResultStatus.Ignored };
    }

    if (useDM) {
      try {
        const dmChannel = await this.bot.getDMChannel(user.id);
        await dmChannel.createMessage(str);
        return {
          status: MessageResultStatus.DirectMessaged,
          text: "user notified with a direct message",
        };
      } catch (e) {} // tslint:disable-line
    }

    const messageChannel = this.getConfig().message_channel;

    if (useChannel && messageChannel) {
      try {
        const channel = this.guild.channels.get(messageChannel) as TextChannel;
        await channel.createMessage(`<@!${user.id}> ${str}`);
        return {
          status: MessageResultStatus.ChannelMessaged,
          text: `user notified in <#${channel.id}>`,
        };
      } catch (e) {} // tslint:disable-line
    }

    return {
      status: MessageResultStatus.Failed,
      text: "failed to message user",
    };
  }
}
