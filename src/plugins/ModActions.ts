import { Plugin, decorators as d, waitForReaction } from "knub";
import {
  Guild,
  GuildAuditLogEntry,
  Member,
  Message,
  TextChannel,
  User
} from "eris";
import * as moment from "moment-timezone";
import { GuildModActions } from "../data/GuildModActions";
import {
  convertDelayStringToMS,
  errorMessage,
  formatTemplateString,
  stripObjectToScalars,
  successMessage
} from "../utils";
import { GuildMutes } from "../data/GuildMutes";
import Timer = NodeJS.Timer;
import ModAction from "../models/ModAction";
import { ModActionType } from "../data/ModActionType";
import { GuildServerLogs } from "../data/GuildServerLogs";
import { LogType } from "../data/LogType";

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

export class ModActionsPlugin extends Plugin {
  protected modActions: GuildModActions;
  protected mutes: GuildMutes;
  protected serverLogs: GuildServerLogs;

  protected muteClearIntervalId: Timer;

  async onLoad() {
    this.modActions = new GuildModActions(this.guildId);
    this.mutes = new GuildMutes(this.guildId);
    this.serverLogs = new GuildServerLogs(this.guildId);

    // Check for expired mutes every 5s
    this.clearExpiredMutes();
    this.muteClearIntervalId = setInterval(
      () => this.clearExpiredMutes(),
      5000
    );
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
        mute_message:
          "You have been muted on {guildName}. Reason given: {reason}",
        timed_mute_message:
          "You have been muted on {guildName} for {time}. Reason given: {reason}",
        kick_message:
          "You have been kicked from {guildName}. Reason given: {reason}",
        ban_message:
          "You have been banned from {guildName}. Reason given: {reason}",
        log_automatic_actions: true,
        action_log_channel: null,
        alert_on_rejoin: false,
        alert_channel: null
      },
      permissions: {
        note: false,
        warn: false,
        mute: false,
        kick: false,
        ban: false,
        view: false
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
            view: true
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
    const relevantAuditLogEntry = await this.findRelevantAuditLogEntry(
      "MEMBER_BAN_ADD",
      user.id
    );

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      await this.createModAction(
        user.id,
        modId,
        ModActionType.Ban,
        auditLogId,
        relevantAuditLogEntry.reason,
        true
      );
    } else {
      await this.createModAction(user.id, null, ModActionType.Ban);
    }
  }

  /**
   * Add an UNBAN mod action automatically when a user is unbanned.
   * Attempts to find the unban's details in the audit log.
   */
  @d.event("guildBanRemove")
  async onGuildBanRemove(guild: Guild, user: User) {
    const relevantAuditLogEntry = await this.findRelevantAuditLogEntry(
      "MEMBER_BAN_REMOVE",
      user.id
    );

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      await this.createModAction(
        user.id,
        modId,
        ModActionType.Unban,
        auditLogId,
        null,
        true
      );
    } else {
      await this.createModAction(user.id, null, ModActionType.Unban);
    }
  }

  /**
   * Show an alert if a member with prior notes joins the server
   */
  @d.event("guildMemberAdd")
  async onGuildMemberAdd(member: Member) {
    if (!this.configValue("alert_on_rejoin")) return;

    const alertChannelId = this.configValue("alert_channel");
    if (!alertChannelId) return;

    const actions = await this.modActions.getByUserId(member.id);

    if (actions.length) {
      const alertChannel: any = this.guild.channels.get(alertChannelId);
      alertChannel.send(
        `<@!${member.id}> (${member.user.username}#${
          member.user.discriminator
        } \`${member.id}\`) joined with ${actions.length} prior record(s)`
      );
    }
  }

  /**
   * Update the specified case by adding more notes/details to it
   */
  @d.command(/update|updatecase/, "<caseNumber:number> <note:string$>")
  @d.permission("note")
  async updateCmd(msg: Message, args: any) {
    const action = await this.modActions.findByCaseNumber(args.caseNumber);
    if (!action) {
      msg.channel.createMessage("Case not found!");
      return;
    }

    if (action.mod_id === null) {
      // If the action has no moderator information, assume the first one to update it did the action
      await this.modActions.update(action.id, {
        mod_id: msg.author.id,
        mod_name: `${msg.author.username}#${msg.author.discriminator}`
      });
    }

    await this.createModActionNote(action.id, msg.author.id, args.note);
    this.postModActionToActionLog(action.id); // Post updated action to action log
  }

  @d.command("note", "<userId:string> <note:string$>")
  @d.permission("note")
  async noteCmd(msg: Message, args: any) {
    await this.createModAction(
      args.userId,
      msg.author.id,
      ModActionType.Note,
      null,
      args.note
    );
  }

  @d.command("warn", "<member:Member> <reason:string$>")
  @d.permission("warn")
  async warnCmd(msg: Message, args: any) {
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
      const reply = await waitForReaction(this.bot, failedMsg, ["✅", "❌"]);
      failedMsg.delete();
      if (!reply || reply.name === "❌") {
        return;
      }
    }

    await this.createModAction(
      args.member.id,
      msg.author.id,
      ModActionType.Warn,
      null,
      args.reason
    );

    msg.channel.createMessage(successMessage("Member warned"));

    this.serverLogs.log(LogType.MEMBER_WARN, {
      mod: stripObjectToScalars(msg.member, ["user"]),
      member: stripObjectToScalars(args.member, ["user"])
    });
  }

  @d.command("mute", "<member:Member> [time:string] [reason:string$]")
  @d.permission("mute")
  async muteCmd(msg: Message, args: any) {
    if (!this.configValue("mute_role")) {
      msg.channel.createMessage(
        errorMessage("Cannot mute: no mute role specified")
      );
      return;
    }

    // Make sure we're allowed to mute this member
    if (msg.member.id !== args.member.id) {
      const ourLevel = this.getMemberLevel(msg.member);
      const memberLevel = this.getMemberLevel(args.member);
      if (ourLevel <= memberLevel) {
        msg.channel.createMessage(
          errorMessage("Cannot mute: insufficient permissions")
        );
        return;
      }
    }

    // Convert mute time from e.g. "2h30m" to milliseconds
    const muteTime = args.time ? convertDelayStringToMS(args.time) : null;
    if (muteTime == null && args.time) {
      // Invalid muteTime -> assume it's actually part of the reason
      args.reason = `${args.time} ${args.reason ? args.reason : ""}`.trim();
    }

    // Apply "muted" role
    await args.member.addRole(this.configValue("mute_role"));
    await this.mutes.addOrUpdateMute(args.member.id, muteTime);

    // Log the action
    await this.createModAction(
      args.member.id,
      msg.author.id,
      ModActionType.Mute,
      null,
      args.reason
    );

    // Message the user informing them of the mute
    let messageSent = false;
    if (args.reason) {
      const muteMessage = formatTemplateString(
        this.configValue("mute_message"),
        {
          guildName: this.guild.name,
          reason: args.reason
        }
      );

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
      const unmuteTime = moment()
        .add(muteTime, "ms")
        .format("YYYY-MM-DD HH:mm:ss");

      response = `Member muted until ${unmuteTime}`;
    } else {
      response = `Member muted indefinitely`;
    }

    if (!messageSent) response += " (failed to message user)";
    msg.channel.createMessage(successMessage(response));

    this.serverLogs.log(LogType.MEMBER_MUTE, {
      mod: stripObjectToScalars(msg.member, ["user"]),
      member: stripObjectToScalars(args.member, ["user"])
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
      const actions = await this.modActions.getByUserId(
        args.caseNumberOrUserId
      );

      if (actions.length === 0) {
        msg.channel.createMessage("No cases found for the specified user!");
      } else {
        for (const action of actions) {
          await this.displayModAction(action, msg.channel.id);
        }
      }
    } else {
      // Assume case id
      const action = await this.modActions.findByCaseNumber(
        args.caseNumberOrUserId
      );

      if (!action) {
        msg.channel.createMessage("Case not found!");
        return;
      }

      this.displayModAction(action.id, msg.channel.id);
    }
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

    if (useDM) {
      try {
        const dmChannel = await this.bot.getDMChannel(user.id);
        await dmChannel.createMessage(str);
        messageSent = true;
      } catch (e) {} // tslint:disable-line
    }

    if (useChannel && this.configValue("message_channel")) {
      try {
        const channel = this.guild.channels.get(
          this.configValue("message_channel")
        ) as TextChannel;
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
  protected async displayModAction(
    actionOrId: ModAction | number,
    channelId: string
  ) {
    let action: ModAction;
    if (typeof actionOrId === "number") {
      action = await this.modActions.find(actionOrId);
    } else {
      action = actionOrId;
    }

    if (!action) return;
    if (!this.guild.channels.get(channelId)) return;

    const notes = await this.modActions.getActionNotes(action.id);

    const createdAt = moment(action.created_at);
    const actionTypeStr = ModActionType[action.action_type].toUpperCase();

    const embed: any = {
      title: `${actionTypeStr} - Case #${action.case_number}`,
      footer: {
        text: `Case created at ${createdAt.format("YYYY-MM-DD [at] HH:mm")}`
      },
      fields: [
        {
          name: "User",
          value: `${action.user_name}\n<@!${action.user_id}>`,
          inline: true
        },
        {
          name: "Moderator",
          value: `${action.mod_name}\n<@!${action.mod_id}>`,
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
          name: `${note.mod_name} at ${noteDate.format(
            "YYYY-MM-DD [at] HH:mm"
          )}:`,
          value: note.body
        });
      });
    } else {
      embed.fields.push({
        name: "!!! THIS CASE HAS NO NOTES !!!",
        value: "\u200B"
      });
    }

    (this.bot.guilds
      .get(this.guildId)
      .channels.get(channelId) as TextChannel).createMessage({
      embed
    });
  }

  /**
   * Posts the specified mod action to the guild's action log channel
   */
  protected async postModActionToActionLog(actionOrId: ModAction | number) {
    const actionLogChannelId = this.configValue("action_log_channel");
    if (!actionLogChannelId) return;
    if (!this.guild.channels.get(actionLogChannelId)) return;

    return this.displayModAction(actionOrId, actionLogChannelId);
  }

  /**
   * Attempts to find a relevant audit log entry for the given user and action. Only accepts audit log entries from the past 10 minutes.
   */
  protected async findRelevantAuditLogEntry(
    actionType: string,
    userId: string
  ): Promise<GuildAuditLogEntry> {
    const auditLogEntries = await this.bot.getGuildAuditLogs(
      this.guildId,
      5,
      actionType
    );

    auditLogEntries.entries.sort((a, b) => {
      if (a.createdAt > b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });

    const cutoffDate = new Date();
    cutoffDate.setTime(cutoffDate.getTime() - 1000 * 15);
    const cutoffTS = cutoffDate.getTime();

    return auditLogEntries.entries.find(entry => {
      return entry.target.id === userId && entry.createdAt >= cutoffTS;
    });
  }

  protected async createModAction(
    userId: string,
    modId: string,
    actionType: ModActionType,
    auditLogId: string = null,
    reason: string = null,
    automatic = false
  ): Promise<number> {
    const user = this.bot.users.get(userId);
    const userName = user
      ? `${user.username}#${user.discriminator}`
      : "Unknown#0000";

    const mod = this.bot.users.get(modId);
    const modName = mod
      ? `${mod.username}#${mod.discriminator}`
      : "Unknown#0000";

    const createdId = await this.modActions.create({
      user_id: userId,
      user_name: userName,
      mod_id: modId,
      mod_name: modName,
      action_type: actionType,
      audit_log_id: auditLogId
    });

    if (reason) {
      await this.createModActionNote(createdId, modId, reason);
    }

    if (
      this.configValue("action_log_channel") &&
      (!automatic || this.configValue("log_automatic_actions"))
    ) {
      try {
        await this.postModActionToActionLog(createdId);
      } catch (e) {} // tslint:disable-line
    }

    return createdId;
  }

  protected async createModActionNote(
    modActionId: number,
    modId: string,
    body: string
  ) {
    const mod = this.bot.users.get(modId);
    const modName = mod
      ? `${mod.username}#${mod.discriminator}`
      : "Unknown#0000";

    return this.modActions.createNote(modActionId, {
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
        await member.removeRole(this.configValue("mute_role"));
      } catch (e) {} // tslint:disable-line

      await this.mutes.clear(member.id);

      this.serverLogs.log(LogType.MEMBER_UNMUTE, {
        member: stripObjectToScalars(member, ["user"])
      });
    }
  }
}
