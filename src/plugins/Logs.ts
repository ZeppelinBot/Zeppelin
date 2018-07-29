import { decorators as d, Plugin } from "knub";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import {
  Channel,
  Constants as ErisConstants,
  Member,
  Message,
  PrivateChannel,
  TextChannel,
  User
} from "eris";
import { findRelevantAuditLogEntry, formatTemplateString, stripObjectToScalars } from "../utils";
import DefaultLogMessages from "../data/DefaultLogMessages.json";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import isEqual from "lodash.isequal";
import diff from "lodash.difference";

interface ILogChannel {
  include?: LogType[];
  exclude?: LogType[];
}

interface ILogChannelMap {
  [channelId: string]: ILogChannel;
}

const unknownUser = {
  id: 0,
  username: "Unknown",
  discriminator: "0000"
};

export class LogsPlugin extends Plugin {
  protected serverLogs: GuildLogs;
  protected logListener;

  getDefaultOptions() {
    return {
      config: {
        channels: {},
        format: {
          timestamp: "HH:mm:ss",
          ...DefaultLogMessages
        }
      }
    };
  }

  onLoad() {
    this.serverLogs = new GuildLogs(this.guildId);

    this.logListener = ({ type, data }) => this.log(type, data);
    this.serverLogs.on("log", this.logListener);
  }

  onUnload() {
    this.serverLogs.removeListener("log", this.logListener);
  }

  async log(type, data) {
    const logChannels: ILogChannelMap = this.configValue("channels");
    for (const [channelId, opts] of Object.entries(logChannels)) {
      const channel = this.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;

      if (
        (opts.include && opts.include.includes(type)) ||
        (opts.exclude && !opts.exclude.includes(type))
      ) {
        const message = this.getLogMessage(type, data);
        if (message) await channel.createMessage(message);
      }
    }
  }

  getLogMessage(type, data): string {
    const format = this.configValue(`format.${LogType[type]}`, "");
    if (format === "") return;

    const formatted = formatTemplateString(format, data);

    const timestampFormat = this.configValue("format.timestamp");
    if (timestampFormat) {
      const timestamp = moment().format(timestampFormat);
      return `\`[${timestamp}]\` ${formatted}`;
    } else {
      return formatted;
    }
  }

  @d.event("guildMemberAdd")
  onMemberJoin(_, member) {
    const newThreshold = moment().valueOf() - 1000 * 60 * 60;
    const accountAge = humanizeDuration(moment().valueOf() - member.createdAt, {
      largest: 2,
      round: true
    });

    this.log(LogType.MEMBER_JOIN, {
      member: stripObjectToScalars(member, ["user"]),
      new: member.createdAt >= newThreshold ? " :new:" : "",
      account_age: accountAge
    });
  }

  @d.event("guildMemberRemove")
  onMemberLeave(_, member) {
    this.log(LogType.MEMBER_LEAVE, {
      member: stripObjectToScalars(member, ["user"])
    });
  }

  @d.event("guildBanAdd")
  async onMemberBan(_, user) {
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_ADD,
      user.id
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : unknownUser;

    this.log(LogType.MEMBER_BAN, {
      user: stripObjectToScalars(user),
      mod: stripObjectToScalars(mod)
    });
  }

  @d.event("guildBanRemove")
  async onMemberUnban(_, user) {
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_REMOVE,
      user.id
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : unknownUser;

    this.log(LogType.MEMBER_UNBAN, {
      user: stripObjectToScalars(user),
      mod: stripObjectToScalars(mod)
    });
  }

  @d.event("guildMemberUpdate")
  async onMemberUpdate(_, member: Member, oldMember: Member) {
    if (!oldMember) return;

    if (member.nick !== oldMember.nick) {
      this.log(LogType.MEMBER_NICK_CHANGE, {
        member,
        oldNick: oldMember.nick,
        newNick: member.nick
      });
    }

    if (!isEqual(oldMember.roles, member.roles)) {
      const addedRoles = diff(member.roles, oldMember.roles);
      const removedRoles = diff(oldMember.roles, member.roles);

      const relevantAuditLogEntry = await findRelevantAuditLogEntry(
        this.guild,
        ErisConstants.AuditLogActions.MEMBER_ROLE_UPDATE,
        member.id
      );
      const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : unknownUser;

      if (addedRoles.length) {
        this.log(LogType.MEMBER_ROLE_ADD, {
          member,
          role: this.guild.roles.get(addedRoles[0]),
          mod: stripObjectToScalars(mod)
        });
      } else if (removedRoles.length) {
        this.log(LogType.MEMBER_ROLE_REMOVE, {
          member,
          role: this.guild.roles.get(removedRoles[0]),
          mod: stripObjectToScalars(mod)
        });
      }
    }
  }

  @d.event("userUpdate")
  onUserUpdate(user: User, oldUser: User) {
    if (!oldUser) return;

    if (user.username !== oldUser.username || user.discriminator !== oldUser.discriminator) {
      const member = this.guild.members.get(user.id) || { id: user.id, user };
      this.log(LogType.MEMBER_USERNAME_CHANGE, {
        member: stripObjectToScalars(member, ["user"]),
        oldName: `${oldUser.username}#${oldUser.discriminator}`,
        newName: `${user.username}#${user.discriminator}`
      });
    }
  }

  @d.event("channelCreate")
  onChannelCreate(channel) {
    this.log(LogType.CHANNEL_CREATE, {
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("channelDelete")
  onChannelDelete(channel) {
    this.log(LogType.CHANNEL_DELETE, {
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("guildRoleCreate")
  onRoleCreate(_, role) {
    this.log(LogType.ROLE_CREATE, {
      role: stripObjectToScalars(role)
    });
  }

  @d.event("guildRoleDelete")
  onRoleDelete(_, role) {
    this.log(LogType.ROLE_DELETE, {
      role: stripObjectToScalars(role)
    });
  }

  @d.event("messageUpdate")
  onMessageUpdate(msg: Message, oldMsg: Message) {
    if (oldMsg && msg.content === oldMsg.content) return;

    this.log(LogType.MESSAGE_EDIT, {
      member: stripObjectToScalars(msg.member, ["user"]),
      channel: stripObjectToScalars(msg.channel),
      before: oldMsg ? oldMsg.content || "" : "Unavailable due to restart",
      after: msg.content || ""
    });
  }

  @d.event("messageDelete")
  onMessageDelete(msg: Message) {
    this.log(LogType.MESSAGE_DELETE, {
      member: stripObjectToScalars(msg.member, ["user"]),
      channel: stripObjectToScalars(msg.channel),
      messageText: msg.cleanContent || ""
    });
  }

  @d.event("messageDeleteBulk")
  onMessageDeleteBulk(messages: Message[]) {
    this.log(LogType.MESSAGE_DELETE_BULK, {
      count: messages.length,
      channel: messages[0] ? messages[0].channel : null
    });
  }

  @d.event("voiceChannelJoin")
  onVoiceChannelJoin(member: Member, channel: Channel) {
    this.log(LogType.VOICE_CHANNEL_JOIN, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("voiceChannelLeave")
  onVoiceChannelLeave(member: Member, channel: Channel) {
    this.log(LogType.VOICE_CHANNEL_LEAVE, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("voiceChannelSwitch")
  onVoiceChannelSwitch(member: Member, newChannel: Channel, oldChannel: Channel) {
    this.log(LogType.VOICE_CHANNEL_MOVE, {
      member: stripObjectToScalars(member, ["user"]),
      oldChannel: stripObjectToScalars(oldChannel),
      newChannel: stripObjectToScalars(newChannel)
    });
  }
}
