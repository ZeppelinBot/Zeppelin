import { Plugin, decorators as d } from "knub";
import {
  Guild,
  GuildAuditLogEntry,
  Member,
  Message,
  TextChannel,
  User
} from "eris";
import * as moment from "moment";
import { GuildModActions } from "../data/GuildModActions";

enum ActionType {
  Ban = 1,
  Unban,
  Note,
  Warn,
  Kick
}

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

export class ModActionsPlugin extends Plugin {
  protected modActions: GuildModActions;

  async onLoad() {
    this.modActions = new GuildModActions(this.guildId);
  }

  getDefaultOptions() {
    return {
      config: {
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
        mute_message: "You have been muted on {guildName} for {reason}",
        kick_message: "You have been kicked from {guildName} for {reason}",
        ban_message: "You have been banned from {guildName} for {reason}",
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

    let modActionId;

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      modActionId = await this.createModAction(
        user.id,
        modId,
        ActionType.Ban,
        auditLogId
      );

      if (relevantAuditLogEntry.reason) {
        await this.createModActionNote(
          modActionId,
          modId,
          relevantAuditLogEntry.reason
        );
      }
    } else {
      modActionId = await this.createModAction(user.id, null, ActionType.Ban);
    }

    this.displayModAction(modActionId);
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

    let modActionId;

    if (relevantAuditLogEntry) {
      const modId = relevantAuditLogEntry.user.id;
      const auditLogId = relevantAuditLogEntry.id;

      modActionId = await this.createModAction(
        user.id,
        modId,
        ActionType.Unban,
        auditLogId
      );
    } else {
      modActionId = await this.createModAction(user.id, null, ActionType.Unban);
    }

    this.displayModAction(modActionId);
  }

  /**
   * Show an alert if a member with prior notes joins the server
   */
  @d.event("guildMemberAdd")
  async onGuildMemberAdd(member: Member) {
    if (! this.configValue('alert_on_rejoin')) return;

    const alertChannelId = this.configValue('alert_channel');
    if (! alertChannelId) return;

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
   * Update the specified case by adding more details to it
   */
  @d.command("update", "<caseNumber:number> <note:string$>")
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

    this.displayModAction(action.id, msg.channel.id);
  }

  /**
   * Create a new NOTE type mod action and add the specified note to it
   */
  @d.command("note", "<userId:string> <note:string$>")
  @d.permission("note")
  async noteCmd(msg: Message, args: any) {
    const actionId = await this.createModAction(
      args.userId,
      msg.author.id,
      ActionType.Note
    );
    await this.createModActionNote(actionId, msg.author.id, args.note);

    this.displayModAction(actionId, msg.channel.id);
  }

  /**
   * Display a case or list of cases
   * If the argument passed is a case id, display that case
   * If the argument passed is a user id, show all cases on that user
   */
  @d.command("/showcase|case|cases|usercases/", "<caseNumberOrUserId:string>")
  @d.permission("view")
  async showcaseCmd(msg: Message, args: any) {
    if (args.caseNumberOrUserId.length >= 17) {
      // Assume user id
      const actions = await this.modActions.getByUserId(args.userId);

      if (actions.length === 0) {
        msg.channel.createMessage("No cases found for the specified user!");
      } else {
        for (const action of actions) {
          await this.displayModAction(action, msg.channel.id);
        }
      }
    } else {
      // Assume case id
      const action = await this.modActions.findByCaseNumber(args.caseNumber);

      if (!action) {
        msg.channel.createMessage("Case not found!");
        return;
      }

      this.displayModAction(action.id, msg.channel.id);
    }
  }

  /**
   * Shows information about the specified action in a message embed.
   * If no channelId is specified, uses the channel id from config.
   */
  protected async displayModAction(actionOrId: any, channelId: string = null) {
    let action;
    if (typeof actionOrId === "number") {
      action = await this.modActions.find(actionOrId);
    } else {
      action = actionOrId;
    }

    if (!action) return;

    if (!channelId) {
      channelId = this.configValue('action_log_channel');
    }

    if (!channelId) return;

    const notes = await this.modActions.getActionNotes(action.id);

    const createdAt = moment(action.created_at);
    const actionTypeStr = ActionType[action.action_type].toUpperCase();

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
        embed.addField(
          `${note.mod_name} at ${noteDate.format("YYYY-MM-DD [at] HH:mm")}:`,
          note.body
        );
      });
    } else {
      embed.addField("!!! THIS CASE HAS NO NOTES !!!", "\u200B");
    }

    (this.bot.guilds
      .get(this.guildId)
      .channels.get(channelId) as TextChannel).createMessage({
      embed
    });
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
    actionType: ActionType,
    auditLogId: string = null
  ): Promise<number> {
    const user = this.bot.users.get(userId);
    const userName = user
      ? `${user.username}#${user.discriminator}`
      : "Unknown#0000";

    const mod = this.bot.users.get(modId);
    const modName = mod
      ? `${mod.username}#${mod.discriminator}`
      : "Unknown#0000";

    return this.modActions.create({
      user_id: userId,
      user_name: userName,
      mod_id: modId,
      mod_name: modName,
      action_type: actionType,
      audit_log_id: auditLogId
    });
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
      body
    });
  }
}
