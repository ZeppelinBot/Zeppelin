import { decorators as d, Plugin, waitForReaction, waitForReply } from "knub";
import { Constants as ErisConstants, Guild, Member, Message, TextChannel, User } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import chunk from "lodash.chunk";
import { GuildCases } from "../data/GuildCases";
import {
  convertDelayStringToMS,
  DBDateFormat,
  disableLinkPreviews,
  errorMessage,
  findRelevantAuditLogEntry,
  formatTemplateString,
  stripObjectToScalars,
  successMessage,
  trimLines
} from "../utils";
import { GuildMutes } from "../data/GuildMutes";
import { Case } from "../data/entities/Case";
import { CaseTypes } from "../data/CaseTypes";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import Timer = NodeJS.Timer;
import { CaseTypeColors } from "../data/CaseTypeColors";

enum IgnoredEventType {
  Ban = 1,
  Unban,
  Kick
}

interface IIgnoredEvent {
  type: IgnoredEventType;
  userId: string;
}

const CASE_LIST_REASON_MAX_LENGTH = 80;

export class ModActionsPlugin extends Plugin {
  public mutes: GuildMutes;
  protected cases: GuildCases;
  protected serverLogs: GuildLogs;

  protected muteClearIntervalId: Timer;

  protected ignoredEvents: IIgnoredEvent[];

  async onLoad() {
    this.cases = GuildCases.getInstance(this.guildId);
    this.mutes = GuildMutes.getInstance(this.guildId);
    this.serverLogs = new GuildLogs(this.guildId);

    this.ignoredEvents = [];

    // Check for expired mutes every 5s
    this.clearExpiredMutes();
    this.muteClearIntervalId = setInterval(() => this.clearExpiredMutes(), 5000);
  }

  async onUnload() {
    clearInterval(this.muteClearIntervalId);
  }

  getDefaultOptions() {
    return {
      config: {
        mute_role: null,
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
        log_automatic_actions: true,
        case_log_channel: null,
        alert_on_rejoin: false,
        alert_channel: null
      },
      permissions: {
        note: false,
        warn: false,
        mute: false,
        kick: false,
        ban: false,
        view: false,
        addcase: false,
        massban: true
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
            addcase: true
          }
        },
        {
          level: ">=100",
          permissions: {
            massban: true
          }
        }
      ]
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
      user.id
    );

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      await this.createCase(user.id, modId, CaseTypes.Ban, auditLogId, relevantAuditLogEntry.reason, true);
    } else {
      await this.createCase(user.id, null, CaseTypes.Ban);
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
      user.id
    );

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      await this.createCase(user.id, modId, CaseTypes.Unban, auditLogId, null, true);
    } else {
      await this.createCase(user.id, null, CaseTypes.Unban);
    }
  }

  /**
   * Show an alert if a member with prior notes joins the server
   */
  @d.event("guildMemberAdd")
  async onGuildMemberAdd(_, member: Member) {
    if (!this.configValue("alert_on_rejoin")) return;

    const alertChannelId = this.configValue("alert_channel");
    if (!alertChannelId) return;

    const actions = await this.cases.getByUserId(member.id);

    if (actions.length) {
      const alertChannel: any = this.guild.channels.get(alertChannelId);
      alertChannel.send(
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${member.id}\`) joined with ${
          actions.length
        } prior record(s)`
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
      member.id
    );

    if (kickAuditLogEntry) {
      this.createCase(
        member.id,
        kickAuditLogEntry.user.id,
        CaseTypes.Kick,
        kickAuditLogEntry.id,
        kickAuditLogEntry.reason,
        true
      );
      this.serverLogs.log(LogType.MEMBER_KICK, {
        user: stripObjectToScalars(member.user),
        mod: stripObjectToScalars(kickAuditLogEntry.user)
      });
    }
  }

  /**
   * Update the specified case by adding more notes/details to it
   */
  @d.command(/update|updatecase/, "<caseNumber:number> <note:string$>")
  @d.permission("note")
  async updateCmd(msg: Message, args: any) {
    const theCase = await this.cases.findByCaseNumber(args.caseNumber);
    if (!theCase) {
      msg.channel.createMessage("Case not found!");
      return;
    }

    if (theCase.mod_id === null) {
      // If the action has no moderator information, assume the first one to update it did the action
      await this.cases.update(theCase.id, {
        mod_id: msg.author.id,
        mod_name: `${msg.author.username}#${msg.author.discriminator}`
      });
    }

    await this.createCaseNote(theCase.id, msg.author.id, args.note);
    this.postCaseToCaseLog(theCase.id); // Post updated case to case log

    if (msg.channel.id !== this.configValue("case_log_channel")) {
      msg.channel.createMessage(successMessage(`Case \`#${theCase.case_number}\` updated`));
    }
  }

  @d.command("note", "<userId:userId> <note:string$>")
  @d.permission("note")
  async noteCmd(msg: Message, args: any) {
    const user = await this.bot.users.get(args.userId);
    const userName = user ? `${user.username}#${user.discriminator}` : "member";

    await this.createCase(args.userId, msg.author.id, CaseTypes.Note, null, args.note);
    msg.channel.createMessage(successMessage(`Note added on ${userName}`));
  }

  @d.command("warn", "<member:Member> <reason:string$>")
  @d.permission("warn")
  @d.nonBlocking()
  async warnCmd(msg: Message, args: any) {
    // Make sure we're allowed to warn this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot warn: insufficient permissions"));
      return;
    }

    const warnMessage = this.configValue("warn_message")
      .replace("{guildName}", this.guild.name)
      .replace("{reason}", args.reason);

    const messageSent = await this.tryToMessageUser(
      args.member.user,
      warnMessage,
      this.configValue("dm_on_warn"),
      this.configValue("message_on_warn")
    );

    if (!messageSent) {
      const failedMsg = await msg.channel.createMessage("Failed to message the user. Log the warning anyway?");
      const reply = await waitForReaction(this.bot, failedMsg, ["✅", "❌"], msg.author.id);
      failedMsg.delete();
      if (!reply || reply.name === "❌") {
        return;
      }
    }

    await this.createCase(args.member.id, msg.author.id, CaseTypes.Warn, null, args.reason);

    msg.channel.createMessage(
      successMessage(`Warned **${args.member.user.username}#${args.member.user.discriminator}**`)
    );

    this.serverLogs.log(LogType.MEMBER_WARN, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  public async muteMember(member: Member, muteTime: number = null, reason: string = null) {
    await member.addRole(this.configValue("mute_role"));
    await this.mutes.addOrUpdateMute(member.id, muteTime);
  }

  @d.command("mute", "<member:Member> [time:string] [reason:string$]")
  @d.permission("mute")
  async muteCmd(msg: Message, args: any) {
    if (!this.configValue("mute_role")) {
      msg.channel.createMessage(errorMessage("Cannot mute: no mute role specified"));
      return;
    }

    // Make sure we're allowed to mute this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot mute: insufficient permissions"));
      return;
    }

    let messageSent = true;

    // Convert mute time from e.g. "2h30m" to milliseconds
    const muteTime = args.time ? convertDelayStringToMS(args.time) : null;
    const timeUntilUnmute = muteTime && humanizeDuration(muteTime);

    if (muteTime == null && args.time) {
      // Invalid muteTime -> assume it's actually part of the reason
      args.reason = `${args.time} ${args.reason ? args.reason : ""}`.trim();
    }

    // Apply "muted" role
    this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_ADD, args.member.id);
    await this.muteMember(args.member, muteTime, args.reason);

    const mute = await this.mutes.findExistingMuteForUserId(args.member.id);
    const hasOldCase = mute && mute.case_id != null;

    if (hasOldCase) {
      if (args.reason) {
        await this.createCaseNote(mute.case_id, msg.author.id, args.reason);
        this.postCaseToCaseLog(mute.case_id);
      }
    } else {
      // Create a case
      const caseId = await this.createCase(args.member.id, msg.author.id, CaseTypes.Mute, null, args.reason);
      await this.mutes.setCaseId(args.member.id, caseId);
    }

    // Message the user informing them of the mute
    // Don't message them if we're updating an old mute
    if (args.reason && !hasOldCase) {
      const template = muteTime ? this.configValue("timed_mute_message") : this.configValue("mute_message");

      const muteMessage = formatTemplateString(template, {
        guildName: this.guild.name,
        reason: args.reason,
        time: timeUntilUnmute
      });

      messageSent = await this.tryToMessageUser(
        args.member.user,
        muteMessage,
        this.configValue("dm_on_mute"),
        this.configValue("message_on_mute")
      );
    }

    // Confirm the action to the moderator
    let response;
    if (muteTime) {
      response = `Muted **${args.member.user.username}#${args.member.user.discriminator}** for ${timeUntilUnmute}`;
    } else {
      response = `Muted **${args.member.user.username}#${args.member.user.discriminator}** indefinitely`;
    }

    if (!messageSent) response += " (failed to message user)";
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_MUTE, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("unmute", "<member:Member> [time:string] [reason:string$]")
  @d.permission("mute")
  async unmuteCmd(msg: Message, args: any) {
    if (!this.configValue("mute_role")) {
      msg.channel.createMessage(errorMessage("Cannot unmute: no mute role specified"));
      return;
    }

    // Make sure we're allowed to mute this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot unmute: insufficient permissions"));
      return;
    }

    // Check if they're muted in the first place
    const mute = await this.mutes.findExistingMuteForUserId(args.member.id);
    if (!mute) {
      msg.channel.createMessage(errorMessage("Cannot unmute: member is not muted"));
      return;
    }

    // Convert unmute time from e.g. "2h30m" to milliseconds
    const unmuteTime = args.time ? convertDelayStringToMS(args.time) : null;

    if (unmuteTime == null && args.time) {
      // Invalid unmuteTime -> assume it's actually part of the reason
      args.reason = `${args.time} ${args.reason ? args.reason : ""}`.trim();
    }

    if (unmuteTime) {
      // If we have an unmute time, just update the old mute to expire in that time
      const timeUntilUnmute = unmuteTime && humanizeDuration(unmuteTime);
      this.mutes.addOrUpdateMute(args.member.id, unmuteTime);
      args.reason = args.reason ? `Timed unmute: ${args.reason}` : "Timed unmute";

      // Confirm the action to the moderator
      msg.channel.createMessage(
        successMessage(
          `Unmuting **${args.member.user.username}#${args.member.user.discriminator}** in ${timeUntilUnmute}`
        )
      );
    } else {
      // Otherwise remove "muted" role immediately
      this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, args.member.id);
      await args.member.removeRole(this.configValue("mute_role"));
      await this.mutes.clear(args.member.id);

      // Confirm the action to the moderator
      msg.channel.createMessage(
        successMessage(`Unmuted **${args.member.user.username}#${args.member.user.discriminator}**`)
      );
    }

    // Create a case
    await this.createCase(args.member.id, msg.author.id, CaseTypes.Unmute, null, args.reason);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_UNMUTE, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("mutes")
  @d.permission("view")
  async mutesCmd(msg: Message) {
    const lines = [];

    // Active, logged mutes
    const activeMutes = await this.mutes.getActiveMutes();
    activeMutes.sort((a, b) => {
      if (a.expires_at == null && b.expires_at != null) return 1;
      if (b.expires_at == null && a.expires_at != null) return -1;
      if (a.expires_at == null && b.expires_at == null) {
        return a.created_at > b.created_at ? -1 : 1;
      }
      return a.expires_at > b.expires_at ? 1 : -1;
    });

    const caseIds = activeMutes.map(m => m.case_id).filter(v => !!v);
    const cases = caseIds.length ? await this.cases.get(caseIds) : [];
    const casesById = cases.reduce((map, c) => map.set(c.id, c), new Map());

    lines.push(
      ...activeMutes.map(mute => {
        const user = this.bot.users.get(mute.user_id);
        const username = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";
        const theCase = casesById[mute.case_id] || null;
        const caseName = theCase ? `Case #${theCase.case_number}` : "No case";

        let line = `\`${caseName}\` **${username}** (\`${mute.user_id}\`)`;

        if (mute.expires_at) {
          const timeUntilExpiry = moment().diff(moment(mute.expires_at, DBDateFormat));
          const humanizedTime = humanizeDuration(timeUntilExpiry, { largest: 2, round: true });
          line += ` (expires in ${humanizedTime})`;
        } else {
          line += ` (doesn't expire)`;
        }

        const mutedAt = moment(mute.created_at, DBDateFormat);
        line += ` (muted at ${mutedAt.format("YYYY-MM-DD HH:mm:ss")})`;

        return line;
      })
    );

    // Manually added mute roles
    const muteUserIds = activeMutes.reduce((set, m) => set.add(m.user_id), new Set());
    const manuallyMutedMembers = [];
    const muteRole = this.configValue("mute_role");

    if (muteRole) {
      this.guild.members.forEach(member => {
        if (muteUserIds.has(member.id)) return;
        if (member.roles.includes(muteRole)) manuallyMutedMembers.push(member);
      });
    }

    lines.push(
      ...manuallyMutedMembers.map(member => {
        return `\`Manual mute\` **${member.user.username}#${member.user.discriminator}** (\`${member.id}\`)`;
      })
    );

    const chunks = chunk(lines, 15);
    for (const [i, chunkLines] of chunks.entries()) {
      let body = chunkLines.join("\n");
      if (i === 0) body = `Active mutes:\n\n${body}`;
      msg.channel.createMessage(body);
    }
  }

  @d.command("kick", "<member:Member> [reason:string$]")
  @d.permission("kick")
  async kickCmd(msg, args) {
    // Make sure we're allowed to kick this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot kick: insufficient permissions"));
      return;
    }

    // Attempt to message the user *before* kicking them, as doing it after may not be possible
    let messageSent = true;
    if (args.reason) {
      const kickMessage = formatTemplateString(this.configValue("kick_message"), {
        guildName: this.guild.name,
        reason: args.reason
      });

      messageSent = await this.tryToMessageUser(
        args.member.user,
        kickMessage,
        this.configValue("dm_on_kick"),
        this.configValue("message_on_kick")
      );
    }

    // Kick the user
    this.serverLogs.ignoreLog(LogType.MEMBER_KICK, args.member.id);
    this.ignoreEvent(IgnoredEventType.Kick, args.member.id);
    args.member.kick(args.reason);

    // Create a case for this action
    await this.createCase(args.member.id, msg.author.id, CaseTypes.Kick, null, args.reason);

    // Confirm the action to the moderator
    let response = `Kicked **${args.member.user.username}#${args.member.user.discriminator}**`;
    if (!messageSent) response += " (failed to message user)";
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_KICK, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("ban", "<member:Member> [reason:string$]")
  @d.permission("ban")
  async banCmd(msg, args) {
    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot ban: insufficient permissions"));
      return;
    }

    // Attempt to message the user *before* banning them, as doing it after may not be possible
    let messageSent = true;
    if (args.reason) {
      const banMessage = formatTemplateString(this.configValue("ban_message"), {
        guildName: this.guild.name,
        reason: args.reason
      });

      messageSent = await this.tryToMessageUser(
        args.member.user,
        banMessage,
        this.configValue("dm_on_ban"),
        this.configValue("message_on_ban")
      );
    }

    // Ban the user
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, args.member.id);
    this.ignoreEvent(IgnoredEventType.Ban, args.member.id);
    args.member.ban(1, args.reason);

    // Create a case for this action
    await this.createCase(args.member.id, msg.author.id, CaseTypes.Ban, null, args.reason);

    // Confirm the action to the moderator
    let response = `Banned **${args.member.user.username}#${args.member.user.discriminator}**`;
    if (!messageSent) response += " (failed to message user)";
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_BAN, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("softban", "<member:Member> [reason:string$]")
  @d.permission("ban")
  async softbanCmd(msg, args) {
    // Make sure we're allowed to ban this member
    if (!this.canActOn(msg.member, args.member)) {
      msg.channel.createMessage(errorMessage("Cannot ban: insufficient permissions"));
      return;
    }

    // Softban the user = ban, and immediately unban
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, args.member.id);
    this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, args.member.id);
    this.ignoreEvent(IgnoredEventType.Ban, args.member.id);
    this.ignoreEvent(IgnoredEventType.Unban, args.member.id);

    await args.member.ban(1, args.reason);
    await this.guild.unbanMember(args.member.id);

    // Create a case for this action
    await this.createCase(args.member.id, msg.author.id, CaseTypes.Softban, null, args.reason);

    // Confirm the action to the moderator
    msg.channel.createMessage(
      successMessage(`Softbanned **${args.member.user.username}#${args.member.user.discriminator}**`)
    );

    // Log the action
    this.serverLogs.log(LogType.MEMBER_SOFTBAN, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("unban", "<userId:userId> [reason:string$]")
  @d.permission("ban")
  async unbanCmd(msg: Message, args: any) {
    this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, args.userId);

    try {
      this.ignoreEvent(IgnoredEventType.Unban, args.userId);
      await this.guild.unbanMember(args.userId);
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to unban member"));
      return;
    }

    // Confirm the action
    msg.channel.createMessage(successMessage("Member unbanned!"));

    // Create a case
    this.createCase(args.userId, msg.author.id, CaseTypes.Unban, null, args.reason);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_UNBAN, {
      mod: stripObjectToScalars(msg.member.user),
      userId: args.userId
    });
  }

  @d.command("forceban", "<userId:userId> [reason:string$]")
  @d.permission("ban")
  async forcebanCmd(msg: Message, args: any) {
    // If the user exists as a guild member, make sure we can act on them first
    const member = this.guild.members.get(args.userId);
    if (member && !this.canActOn(msg.member, member)) {
      msg.channel.createMessage(errorMessage("Cannot forceban this user: insufficient permissions"));
      return;
    }

    this.ignoreEvent(IgnoredEventType.Ban, args.userId);
    this.serverLogs.ignoreLog(LogType.MEMBER_BAN, args.userId);

    try {
      await this.guild.banMember(args.userId, 1, args.reason);
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to forceban member"));
      return;
    }

    // Confirm the action
    msg.channel.createMessage(successMessage("Member forcebanned!"));

    // Create a case
    this.createCase(args.userId, msg.author.id, CaseTypes.Ban, null, args.reason);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_FORCEBAN, {
      mod: stripObjectToScalars(msg.member.user),
      userId: args.userId
    });
  }

  @d.command("massban", "<userIds:string...>")
  @d.permission("massban")
  @d.nonBlocking()
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

    const banReason = banReasonReply.content;

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
        await this.createCase(userId, msg.author.id, CaseTypes.Ban, null, `Mass ban: ${banReason}`, false, false);
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
        count: successfulBanCount
      });

      if (failedBans.length) {
        msg.channel.createMessage(
          successMessage(`Banned ${successfulBanCount} users, ${failedBans.length} failed: ${failedBans.join(" ")}`)
        );
      } else {
        msg.channel.createMessage(successMessage(`Banned ${successfulBanCount} users successfully`));
      }
    }
  }

  @d.command("addcase", "<type:string> <target:userId> [reason:string$]")
  @d.permission("addcase")
  async addcaseCmd(msg: Message, args: any) {
    // Verify the user id is a valid snowflake-ish
    if (!args.target.match(/^[0-9]{17,20}$/)) {
      msg.channel.createMessage(errorMessage("Cannot add case: invalid user id"));
      return;
    }

    // If the user exists as a guild member, make sure we can act on them first
    const member = this.guild.members.get(args.userId);
    if (member && !this.canActOn(msg.member, member)) {
      msg.channel.createMessage(errorMessage("Cannot add case on this user: insufficient permissions"));
      return;
    }

    // Verify the case type is valid
    const type: string = args.type[0].toUpperCase() + args.type.slice(1).toLowerCase();
    if (!CaseTypes[type]) {
      msg.channel.createMessage(errorMessage("Cannot add case: invalid case type"));
      return;
    }

    // Create the case
    const caseId = await this.createCase(args.target, msg.author.id, CaseTypes[type], null, args.reason);
    const theCase = await this.cases.find(caseId);

    // Log the action
    msg.channel.createMessage(successMessage("Case created!"));
    this.serverLogs.log(LogType.CASE_CREATE, {
      mod: stripObjectToScalars(msg.member.user),
      userId: args.userId,
      caseNum: theCase.case_number,
      caseType: type.toUpperCase()
    });
  }

  /**
   * Display a case or list of cases
   * If the argument passed is a case id, display that case
   * If the argument passed is a user id, show all cases on that user
   */
  @d.command(/showcase|case/, "<caseNumber:number>")
  @d.permission("view")
  async showcaseCmd(msg: Message, args: { caseNumber: number }) {
    // Assume case id
    const theCase = await this.cases.findByCaseNumber(args.caseNumber);

    if (!theCase) {
      msg.channel.createMessage("Case not found!");
      return;
    }

    this.displayCase(theCase.id, msg.channel.id);
  }

  @d.command(/cases|usercases/, "<userId:userId> [expanded:string]")
  @d.permission("view")
  async usercasesCmd(msg: Message, args: { userId: string; expanded?: string }) {
    const cases = await this.cases.with("notes").getByUserId(args.userId);
    const user = this.bot.users.get(args.userId);
    const userName = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";
    const prefix = this.knub.getGuildData(this.guildId).config.prefix;

    if (cases.length === 0) {
      msg.channel.createMessage("No cases found for the specified user!");
    } else {
      if (args.expanded && args.expanded.startsWith("expand")) {
        // Expanded view (= individual case embeds)
        for (const theCase of cases) {
          await this.displayCase(theCase.id, msg.channel.id);
        }
      } else {
        // Compact view (= regular message with a preview of each case)
        const lines = [];
        for (const theCase of cases) {
          theCase.notes.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
          const firstNote = theCase.notes[0];
          let reason = firstNote ? firstNote.body : "";

          if (reason.length > CASE_LIST_REASON_MAX_LENGTH) {
            const match = reason.slice(CASE_LIST_REASON_MAX_LENGTH, 20).match(/(?:[.,!?\s]|$)/);
            const nextWhitespaceIndex = match ? CASE_LIST_REASON_MAX_LENGTH + match.index : CASE_LIST_REASON_MAX_LENGTH;
            if (nextWhitespaceIndex < reason.length) {
              reason = reason.slice(0, nextWhitespaceIndex - 1) + "...";
            }
          }

          reason = disableLinkPreviews(reason);

          lines.push(`Case \`#${theCase.case_number}\` __${CaseTypes[theCase.type]}__ ${reason}`);
        }

        const finalMessage = trimLines(`
        Cases for **${userName}**:
        
        ${lines.join("\n")}
        
        Use \`${prefix}case <num>\` to see more info about individual cases        
      `);

        msg.channel.createMessage(finalMessage);
      }
    }
  }

  protected canActOn(member1, member2) {
    if (member1.id === member2.id) {
      return false;
    }

    const ourLevel = this.getMemberLevel(member1);
    const memberLevel = this.getMemberLevel(member2);
    return ourLevel > memberLevel;
  }

  /**
   * Attempts to message the specified user through DMs and/or the message channel.
   * Returns a promise that resolves to a boolean indicating whether we were able to message them or not.
   */
  protected async tryToMessageUser(user: User, str: string, useDM: boolean, useChannel: boolean): Promise<boolean> {
    let messageSent = false;

    if (!useDM && !useChannel) {
      return true;
    }

    if (useDM) {
      try {
        const dmChannel = await this.bot.getDMChannel(user.id);
        await dmChannel.createMessage(str);
        messageSent = true;
      } catch (e) {} // tslint:disable-line
    }

    if (useChannel && this.configValue("message_channel")) {
      try {
        const channel = this.guild.channels.get(this.configValue("message_channel")) as TextChannel;
        await channel.createMessage(`<@!${user.id}> ${str}`);
        messageSent = true;
      } catch (e) {} // tslint:disable-line
    }

    return messageSent;
  }

  /**
   * Shows information about the specified action in a message embed.
   * If no channelId is specified, uses the channel id from config.
   */
  protected async displayCase(caseOrCaseId: Case | number, channelId: string) {
    let theCase: Case;
    if (typeof caseOrCaseId === "number") {
      theCase = await this.cases.with("notes").find(caseOrCaseId);
    } else {
      theCase = caseOrCaseId;
    }

    if (!theCase) return;
    if (!this.guild.channels.get(channelId)) return;

    const createdAt = moment(theCase.created_at);
    const actionTypeStr = CaseTypes[theCase.type].toUpperCase();

    const embed: any = {
      title: `${actionTypeStr} - Case #${theCase.case_number}`,
      footer: {
        text: `Case created at ${createdAt.format("YYYY-MM-DD [at] HH:mm")}`
      },
      fields: [
        {
          name: "User",
          value: `${theCase.user_name}\n<@!${theCase.user_id}>`,
          inline: true
        },
        {
          name: "Moderator",
          value: `${theCase.mod_name}\n<@!${theCase.mod_id}>`,
          inline: true
        }
      ]
    };

    if (CaseTypeColors[theCase.type]) {
      embed.color = CaseTypeColors[theCase.type];
    }

    if (theCase.notes.length) {
      theCase.notes.forEach((note: any) => {
        const noteDate = moment(note.created_at);
        embed.fields.push({
          name: `${note.mod_name} at ${noteDate.format("YYYY-MM-DD [at] HH:mm")}:`,
          value: note.body
        });
      });
    } else {
      embed.fields.push({
        name: "!!! THIS CASE HAS NO NOTES !!!",
        value: "\u200B"
      });
    }

    const channel = this.guild.channels.get(channelId) as TextChannel;
    await channel.createMessage({ embed });
  }

  /**
   * Posts the specified mod action to the guild's action log channel
   */
  protected async postCaseToCaseLog(caseOrCaseId: Case | number) {
    const caseLogChannelId = this.configValue("case_log_channel");
    if (!caseLogChannelId) return;
    if (!this.guild.channels.get(caseLogChannelId)) return;

    return this.displayCase(caseOrCaseId, caseLogChannelId);
  }

  public async createCase(
    userId: string,
    modId: string,
    caseType: CaseTypes,
    auditLogId: string = null,
    reason: string = null,
    automatic = false,
    postInCaseLogOverride = null
  ): Promise<number> {
    const user = this.bot.users.get(userId);
    const userName = user ? `${user.username}#${user.discriminator}` : "Unknown#0000";

    const mod = this.bot.users.get(modId);
    const modName = mod ? `${mod.username}#${mod.discriminator}` : "Unknown#0000";

    const createdId = await this.cases.create({
      type: caseType,
      user_id: userId,
      user_name: userName,
      mod_id: modId,
      mod_name: modName,
      audit_log_id: auditLogId
    });

    if (reason) {
      await this.createCaseNote(createdId, modId, reason);
    }

    if (
      this.configValue("case_log_channel") &&
      (!automatic || this.configValue("log_automatic_actions")) &&
      postInCaseLogOverride !== false
    ) {
      try {
        await this.postCaseToCaseLog(createdId);
      } catch (e) {} // tslint:disable-line
    }

    return createdId;
  }

  protected async createCaseNote(caseId: number, modId: string, body: string) {
    const mod = this.bot.users.get(modId);
    const modName = mod ? `${mod.username}#${mod.discriminator}` : "Unknown#0000";

    return this.cases.createNote(caseId, {
      mod_id: modId,
      mod_name: modName,
      body: body || ""
    });
  }

  protected async clearExpiredMutes() {
    const expiredMutes = await this.mutes.getExpiredMutes();
    for (const mute of expiredMutes) {
      const member = this.guild.members.get(mute.user_id);
      if (!member) continue;

      try {
        this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, member.id);
        await member.removeRole(this.configValue("mute_role"));
      } catch (e) {} // tslint:disable-line

      await this.mutes.clear(member.id);

      this.serverLogs.log(LogType.MEMBER_MUTE_EXPIRED, {
        member: stripObjectToScalars(member, ["user"])
      });
    }
  }
}
