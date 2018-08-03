import { decorators as d, Plugin } from "knub";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { Channel, Constants as ErisConstants, Member, Message, TextChannel, User } from "eris";
import { findRelevantAuditLogEntry, formatTemplateString, stripObjectToScalars } from "../utils";
import DefaultLogMessages from "../data/DefaultLogMessages.json";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import isEqual from "lodash.isequal";
import diff from "lodash.difference";

interface ILogChannel {
  include?: string[];
  exclude?: string[];
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
    const typeStr = LogType[type];

    for (const [channelId, opts] of Object.entries(logChannels)) {
      const channel = this.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;

      if (
        (opts.include && opts.include.includes(typeStr)) ||
        (opts.exclude && !opts.exclude.includes(typeStr))
      ) {
        const message = this.getLogMessage(type, data);
        // TODO: Split log messages that are too long
        if (message) await channel.createMessage(message).catch(() => {});
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

    this.serverLogs.log(LogType.MEMBER_JOIN, {
      member: stripObjectToScalars(member, ["user"]),
      new: member.createdAt >= newThreshold ? " :new:" : "",
      account_age: accountAge
    });
  }

  @d.event("guildMemberRemove")
  onMemberLeave(_, member) {
    this.serverLogs.log(LogType.MEMBER_LEAVE, {
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

    this.serverLogs.log(
      LogType.MEMBER_BAN,
      {
        user: stripObjectToScalars(user),
        mod: stripObjectToScalars(mod)
      },
      user.id
    );
  }

  @d.event("guildBanRemove")
  async onMemberUnban(_, user) {
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_REMOVE,
      user.id
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : unknownUser;

    this.serverLogs.log(
      LogType.MEMBER_UNBAN,
      {
        mod: stripObjectToScalars(mod),
        userId: user.id
      },
      user.id
    );
  }

  @d.event("guildMemberUpdate")
  async onMemberUpdate(_, member: Member, oldMember: Member) {
    if (!oldMember) return;

    if (member.nick !== oldMember.nick) {
      this.serverLogs.log(LogType.MEMBER_NICK_CHANGE, {
        member,
        oldNick: oldMember.nick || "<none>",
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
        this.serverLogs.log(
          LogType.MEMBER_ROLE_ADD,
          {
            member,
            role: this.guild.roles.get(addedRoles[0]),
            mod: stripObjectToScalars(mod)
          },
          member.id
        );
      } else if (removedRoles.length) {
        this.serverLogs.log(
          LogType.MEMBER_ROLE_REMOVE,
          {
            member,
            role: this.guild.roles.get(removedRoles[0]),
            mod: stripObjectToScalars(mod)
          },
          member.id
        );
      }
    }
  }

  @d.event("userUpdate")
  onUserUpdate(user: User, oldUser: User) {
    if (!oldUser) return;

    if (user.username !== oldUser.username || user.discriminator !== oldUser.discriminator) {
      const member = this.guild.members.get(user.id) || { id: user.id, user };
      this.serverLogs.log(LogType.MEMBER_USERNAME_CHANGE, {
        member: stripObjectToScalars(member, ["user"]),
        oldName: `${oldUser.username}#${oldUser.discriminator}`,
        newName: `${user.username}#${user.discriminator}`
      });
    }
  }

  @d.event("channelCreate")
  onChannelCreate(channel) {
    this.serverLogs.log(LogType.CHANNEL_CREATE, {
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("channelDelete")
  onChannelDelete(channel) {
    this.serverLogs.log(LogType.CHANNEL_DELETE, {
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("guildRoleCreate")
  onRoleCreate(_, role) {
    this.serverLogs.log(LogType.ROLE_CREATE, {
      role: stripObjectToScalars(role)
    });
  }

  @d.event("guildRoleDelete")
  onRoleDelete(_, role) {
    this.serverLogs.log(LogType.ROLE_DELETE, {
      role: stripObjectToScalars(role)
    });
  }

  @d.event("messageUpdate")
  onMessageUpdate(msg: Message, oldMsg: Message) {
    if (!msg.author) return;
    if (oldMsg && msg.content === oldMsg.content) return;
    if (msg.type !== 0) return;

    this.serverLogs.log(LogType.MESSAGE_EDIT, {
      member: stripObjectToScalars(msg.member, ["user"]),
      channel: stripObjectToScalars(msg.channel),
      before: oldMsg ? oldMsg.cleanContent || oldMsg.content || "" : "Unavailable due to restart",
      after: msg.cleanContent || msg.content || ""
    });
  }

  @d.event("messageDelete")
  onMessageDelete(msg: Message) {
    if (msg.type != null && msg.type !== 0) return;

    if (msg.member) {
      this.serverLogs.log(
        LogType.MESSAGE_DELETE,
        {
          member: stripObjectToScalars(msg.member, ["user"]),
          channel: stripObjectToScalars(msg.channel),
          messageText: msg.cleanContent || msg.content || ""
        },
        msg.id
      );
    } else {
      this.serverLogs.log(
        LogType.MESSAGE_DELETE_BARE,
        {
          messageId: msg.id,
          channel: stripObjectToScalars(msg.channel)
        },
        msg.id
      );
    }
  }

  @d.event("messageDeleteBulk")
  onMessageDeleteBulk(messages: Message[]) {
    this.serverLogs.log(
      LogType.MESSAGE_DELETE_BULK,
      {
        count: messages.length,
        channel: messages[0] ? messages[0].channel : null
      },
      messages[0] && messages[0].id
    );
  }

  @d.event("voiceChannelJoin")
  onVoiceChannelJoin(member: Member, channel: Channel) {
    this.serverLogs.log(LogType.VOICE_CHANNEL_JOIN, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("voiceChannelLeave")
  onVoiceChannelLeave(member: Member, channel: Channel) {
    this.serverLogs.log(LogType.VOICE_CHANNEL_LEAVE, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel)
    });
  }

  @d.event("voiceChannelSwitch")
  onVoiceChannelSwitch(member: Member, newChannel: Channel, oldChannel: Channel) {
    this.serverLogs.log(LogType.VOICE_CHANNEL_MOVE, {
      member: stripObjectToScalars(member, ["user"]),
      oldChannel: stripObjectToScalars(oldChannel),
      newChannel: stripObjectToScalars(newChannel)
    });
  }
}
