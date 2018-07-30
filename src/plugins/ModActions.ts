import { decorators as d, Plugin, waitForReaction } from "knub";
import { Constants as ErisConstants, Guild, Member, Message, TextChannel, User } from "eris";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import { GuildCases } from "../data/GuildCases";
import {
  convertDelayStringToMS,
  errorMessage,
  findRelevantAuditLogEntry,
  formatTemplateString,
  sleep,
  stripObjectToScalars,
  successMessage
} from "../utils";
import { GuildMutes } from "../data/GuildMutes";
import Case from "../models/Case";
import { CaseType } from "../data/CaseType";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import Timer = NodeJS.Timer;

export class ModActionsPlugin extends Plugin {
  protected cases: GuildCases;
  protected mutes: GuildMutes;
  protected serverLogs: GuildLogs;

  protected muteClearIntervalId: Timer;

  async onLoad() {
    this.cases = new GuildCases(this.guildId);
    this.mutes = new GuildMutes(this.guildId);
    this.serverLogs = new GuildLogs(this.guildId);

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
        dm_on_mute: true,
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
        addcase: false
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
        }
      ]
    };
  }

  /**
   * Add a BAN action automatically when a user is banned.
   * Attempts to find the ban's details in the audit log.
   */
  @d.event("guildBanAdd")
  async onGuildBanAdd(guild: Guild, user: User) {
    await sleep(1000); // Wait a moment for the audit log to update
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_ADD,
      user.id
    );

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      await this.createCase(
        user.id,
        modId,
        CaseType.Ban,
        auditLogId,
        relevantAuditLogEntry.reason,
        true
      );
    } else {
      await this.createCase(user.id, null, CaseType.Ban);
    }
  }

  /**
   * Add an UNBAN mod action automatically when a user is unbanned.
   * Attempts to find the unban's details in the audit log.
   */
  @d.event("guildBanRemove")
  async onGuildBanRemove(guild: Guild, user: User) {
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_REMOVE,
      user.id
    );

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      await this.createCase(user.id, modId, CaseType.Unban, auditLogId, null, true);
    } else {
      await this.createCase(user.id, null, CaseType.Unban);
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
        `<@!${member.id}> (${member.user.username}#${member.user.discriminator} \`${
          member.id
        }\`) joined with ${actions.length} prior record(s)`
      );
    }
  }

  @d.event("guildMemberRemove")
  async onGuildMemberRemove(_, member: Member) {
    const kickAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_KICK,
      member.id
    );

    if (kickAuditLogEntry) {
      this.createCase(
        member.id,
        kickAuditLogEntry.user.id,
        CaseType.Kick,
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
    const action = await this.cases.findByCaseNumber(args.caseNumber);
    if (!action) {
      msg.channel.createMessage("Case not found!");
      return;
    }

    if (action.mod_id === null) {
      // If the action has no moderator information, assume the first one to update it did the action
      await this.cases.update(action.id, {
        mod_id: msg.author.id,
        mod_name: `${msg.author.username}#${msg.author.discriminator}`
      });
    }

    await this.createCaseNote(action.id, msg.author.id, args.note);
    this.postCaseToCaseLog(action.id); // Post updated case to case log
  }

  @d.command("note", "<userId:string> <note:string$>")
  @d.permission("note")
  async noteCmd(msg: Message, args: any) {
    await this.createCase(args.userId, msg.author.id, CaseType.Note, null, args.note);
  }

  @d.command("warn", "<member:Member> <reason:string$>")
  @d.permission("warn")
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
      const failedMsg = await msg.channel.createMessage(
        "Failed to message the user. Log the warning anyway?"
      );
      const reply = await waitForReaction(this.bot, failedMsg, ["✅", "❌"], msg.author.id);
      failedMsg.delete();
      if (!reply || reply.name === "❌") {
        return;
      }
    }

    await this.createCase(args.member.id, msg.author.id, CaseType.Warn, null, args.reason);

    msg.channel.createMessage(successMessage("Member warned"));

    this.serverLogs.log(LogType.MEMBER_WARN, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  public async muteMember(member: Member, muteTime: number = null, reason: string = null) {
    await member.addRole(this.configValue("mute_role"), reason);
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

    // Convert mute time from e.g. "2h30m" to milliseconds
    const muteTime = args.time ? convertDelayStringToMS(args.time) : null;
    const timeUntilUnmute = muteTime && humanizeDuration(muteTime);

    if (muteTime == null && args.time) {
      // Invalid muteTime -> assume it's actually part of the reason
      args.reason = `${args.time} ${args.reason ? args.reason : ""}`.trim();
    }

    // Apply "muted" role
    this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_ADD, args.member.id);
    this.muteMember(args.member, muteTime, args.reason);

    // Create a case
    await this.createCase(args.member.id, msg.author.id, CaseType.Mute, null, args.reason);

    // Message the user informing them of the mute
    let messageSent = true;
    if (args.reason) {
      const template = muteTime
        ? this.configValue("timed_mute_message")
        : this.configValue("mute_message");

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
      response = `Member muted for ${timeUntilUnmute}`;
    } else {
      response = `Member muted indefinitely`;
    }

    if (!messageSent) response += " (failed to message user)";
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_MUTE, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("unmute", "<member:Member> [reason:string$]")
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

    // Remove "muted" role
    this.serverLogs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, args.member.id);
    await args.member.removeRole(this.configValue("mute_role"), args.reason);
    await this.mutes.clear(args.member.id);

    // Confirm the action to the moderator
    msg.channel.createMessage(successMessage("Member unmuted"));

    // Create a case
    await this.createCase(args.member.id, msg.author.id, CaseType.Unmute, null, args.reason);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_UNMUTE, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
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
    args.member.kick(args.reason);

    // Create a case for this action
    await this.createCase(args.member.id, msg.author.id, CaseType.Kick, null, args.reason);

    // Confirm the action to the moderator
    let response = `Member kicked`;
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
    args.member.ban(1, args.reason);

    // Create a case for this action
    await this.createCase(args.member.id, msg.author.id, CaseType.Ban, null, args.reason);

    // Confirm the action to the moderator
    let response = `Member banned`;
    if (!messageSent) response += " (failed to message user)";
    msg.channel.createMessage(successMessage(response));

    // Log the action
    this.serverLogs.log(LogType.MEMBER_BAN, {
      mod: stripObjectToScalars(msg.member.user),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("unban", "<userId:string> [reason:string$]")
  @d.permission("ban")
  async unbanCmd(msg: Message, args: any) {
    this.serverLogs.ignoreLog(LogType.MEMBER_UNBAN, args.member.id);

    try {
      await this.guild.unbanMember(args.userId, args.reason);
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to unban member"));
      return;
    }

    // Confirm the action
    msg.channel.createMessage(successMessage("Member unbanned!"));

    // Create a case
    this.createCase(args.userId, msg.author.id, CaseType.Unban, null, args.reason);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_UNBAN, {
      mod: stripObjectToScalars(msg.member.user),
      userId: args.userId
    });
  }

  @d.command("forceban", "<userId:string> [reason:string$]")
  @d.permission("ban")
  async forcebanCmd(msg: Message, args: any) {
    // If the user exists as a guild member, make sure we can act on them first
    const member = this.guild.members.get(args.userId);
    if (member && !this.canActOn(msg.member, member)) {
      msg.channel.createMessage(
        errorMessage("Cannot forceban this user: insufficient permissions")
      );
      return;
    }

    this.serverLogs.ignoreLog(LogType.MEMBER_FORCEBAN, args.member.id);

    try {
      await this.guild.banMember(args.userId, 1, args.reason);
    } catch (e) {
      msg.channel.createMessage(errorMessage("Failed to forceban member"));
      return;
    }

    // Confirm the action
    msg.channel.createMessage(successMessage("Member forcebanned!"));

    // Create a case
    this.createCase(args.userId, msg.author.id, CaseType.Ban, null, args.reason);

    // Log the action
    this.serverLogs.log(LogType.MEMBER_FORCEBAN, {
      mod: stripObjectToScalars(msg.member.user),
      userId: args.userId
    });
  }

  @d.command("addcase", "<type:string> <target:string> [reason:string$]")
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
      msg.channel.createMessage(
        errorMessage("Cannot add case on this user: insufficient permissions")
      );
      return;
    }

    // Verify the case type is valid
    const type: string = args.type[0].toUpperCase() + args.type.slice(1).toLowerCase();
    if (!CaseType[type]) {
      msg.channel.createMessage(errorMessage("Cannot add case: invalid case type"));
      return;
    }

    // Create the case
    const caseId = await this.createCase(
      args.target,
      msg.author.id,
      CaseType[type],
      null,
      args.reason
    );
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
  @d.command(/showcase|case|cases|usercases/, "<caseNumberOrUserId:string>")
  @d.permission("view")
  async showcaseCmd(msg: Message, args: any) {
    if (args.caseNumberOrUserId.length >= 17) {
      // Assume user id
      const actions = await this.cases.getByUserId(args.caseNumberOrUserId);

      if (actions.length === 0) {
        msg.channel.createMessage("No cases found for the specified user!");
      } else {
        for (const action of actions) {
          await this.displayCase(action, msg.channel.id);
        }
      }
    } else {
      // Assume case id
      const action = await this.cases.findByCaseNumber(args.caseNumberOrUserId);

      if (!action) {
        msg.channel.createMessage("Case not found!");
        return;
      }

      this.displayCase(action.id, msg.channel.id);
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
  protected async tryToMessageUser(
    user: User,
    str: string,
    useDM: boolean,
    useChannel: boolean
  ): Promise<boolean> {
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
      theCase = await this.cases.find(caseOrCaseId);
    } else {
      theCase = caseOrCaseId;
    }

    if (!theCase) return;
    if (!this.guild.channels.get(channelId)) return;

    const notes = await this.cases.getCaseNotes(theCase.id);

    const createdAt = moment(theCase.created_at);
    const actionTypeStr = CaseType[theCase.type].toUpperCase();

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

    if (actionTypeStr === "BAN") {
      embed.color = 0xe67e22;
    } else if (actionTypeStr === "UNBAN") {
      embed.color = 0x9b59b6;
    } else if (actionTypeStr === "NOTE") {
      embed.color = 0x3498db;
    }

    if (notes.length) {
      notes.forEach((note: any) => {
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
    channel.createMessage({ embed });
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
    caseType: CaseType,
    auditLogId: string = null,
    reason: string = null,
    automatic = false
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
      (!automatic || this.configValue("log_automatic_actions"))
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
