import { decorators as d, IPluginOptions, Plugin } from "knub";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { Channel, Constants as ErisConstants, Member, Message, TextChannel, User } from "eris";
import {
  createChunkedMessage,
  deactivateMentions,
  disableCodeBlocks,
  disableLinkPreviews,
  findRelevantAuditLogEntry,
  noop,
  stripObjectToScalars,
  useMediaUrls,
} from "../utils";
import DefaultLogMessages from "../data/DefaultLogMessages.json";
import moment from "moment-timezone";
import humanizeDuration from "humanize-duration";
import isEqual from "lodash.isequal";
import diff from "lodash.difference";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildArchives } from "../data/GuildArchives";
import { GuildCases } from "../data/GuildCases";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { renderTemplate } from "../templateFormatter";

interface ILogChannel {
  include?: string[];
  exclude?: string[];
  batched?: boolean;
  batch_time?: number;
}

interface ILogChannelMap {
  [channelId: string]: ILogChannel;
}

const unknownUser = {
  id: 0,
  username: "Unknown",
  discriminator: "0000",
};

interface IChannelConfig {
  include?: string[];
  exclude?: string[];
  batched?: boolean;
  batch_time?: number;
}

interface ILogsPluginConfig {
  channels: {
    [key: string]: IChannelConfig;
  };
  format: {
    [key: string]: string;
    timestamp: string;
  };
}

interface ILogsPluginPermissions {
  pinged: boolean;
}

export class LogsPlugin extends ZeppelinPlugin<ILogsPluginConfig, ILogsPluginPermissions> {
  public static pluginName = "logs";

  protected guildLogs: GuildLogs;
  protected savedMessages: GuildSavedMessages;
  protected archives: GuildArchives;
  protected cases: GuildCases;

  protected logListener;

  protected batches: Map<string, string[]>;

  private onMessageDeleteFn;
  private onMessageDeleteBulkFn;
  private onMessageUpdateFn;

  getDefaultOptions(): IPluginOptions<ILogsPluginConfig, ILogsPluginPermissions> {
    return {
      config: {
        channels: {},
        format: {
          timestamp: "YYYY-MM-DD HH:mm:ss",
          ...DefaultLogMessages,
        },
      },

      permissions: {
        pinged: true,
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            pinged: false,
          },
        },
      ],
    };
  }

  onLoad() {
    this.guildLogs = new GuildLogs(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
    this.archives = GuildArchives.getInstance(this.guildId);
    this.cases = GuildCases.getInstance(this.guildId);

    this.logListener = ({ type, data }) => this.log(type, data);
    this.guildLogs.on("log", this.logListener);

    this.batches = new Map();

    this.onMessageDeleteFn = this.onMessageDelete.bind(this);
    this.savedMessages.events.on("delete", this.onMessageDeleteFn);

    this.onMessageDeleteBulkFn = this.onMessageDeleteBulk.bind(this);
    this.savedMessages.events.on("deleteBulk", this.onMessageDeleteBulkFn);

    this.onMessageUpdateFn = this.onMessageUpdate.bind(this);
    this.savedMessages.events.on("update", this.onMessageUpdateFn);
  }

  onUnload() {
    this.guildLogs.removeListener("log", this.logListener);

    this.savedMessages.events.off("delete", this.onMessageDeleteFn);
    this.savedMessages.events.off("deleteBulk", this.onMessageDeleteBulkFn);
    this.savedMessages.events.off("update", this.onMessageUpdateFn);
  }

  async log(type, data) {
    const logChannels: ILogChannelMap = this.getConfig().channels;
    const typeStr = LogType[type];

    for (const [channelId, opts] of Object.entries(logChannels)) {
      const channel = this.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;

      if ((opts.include && opts.include.includes(typeStr)) || (opts.exclude && !opts.exclude.includes(typeStr))) {
        const message = await this.getLogMessage(type, data);
        if (message) {
          if (opts.batched) {
            // If we're batching log messages, gather all log messages within the set batch_time into a single message
            if (!this.batches.has(channel.id)) {
              this.batches.set(channel.id, []);
              setTimeout(async () => {
                const batchedMessage = this.batches.get(channel.id).join("\n");
                this.batches.delete(channel.id);
                createChunkedMessage(channel, batchedMessage).catch(noop);
              }, opts.batch_time || 2000);
            }

            this.batches.get(channel.id).push(message);
          } else {
            // If we're not batching log messages, just send them immediately
            await createChunkedMessage(channel, message).catch(noop);
          }
        }
      }
    }
  }

  async getLogMessage(type, data): Promise<string> {
    const config = this.getConfig();
    const format = config.format[LogType[type]] || "";
    if (format === "") return;

    const formatted = await renderTemplate(format, data);

    const timestampFormat = config.format.timestamp;
    if (timestampFormat) {
      const timestamp = moment().format(timestampFormat);
      return `\`[${timestamp}]\` ${formatted}`;
    } else {
      return formatted;
    }
  }

  @d.event("guildMemberAdd")
  async onMemberJoin(_, member) {
    const newThreshold = moment().valueOf() - 1000 * 60 * 60;
    const accountAge = humanizeDuration(moment().valueOf() - member.createdAt, {
      largest: 2,
      round: true,
    });

    this.guildLogs.log(LogType.MEMBER_JOIN, {
      member: stripObjectToScalars(member, ["user"]),
      new: member.createdAt >= newThreshold ? " :new:" : "",
      account_age: accountAge,
    });

    const cases = (await this.cases.with("notes").getByUserId(member.id)).filter(c => !c.is_hidden);
    cases.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));

    if (cases.length) {
      const recentCaseLines = [];
      const recentCases = cases.slice(0, 2);
      for (const theCase of recentCases) {
        recentCaseLines.push(this.cases.getSummaryText(theCase));
      }

      let recentCaseSummary = recentCaseLines.join("\n");
      if (recentCases.length < cases.length) {
        const remaining = cases.length - recentCases.length;
        if (remaining === 1) {
          recentCaseSummary += `\n*+${remaining} case*`;
        } else {
          recentCaseSummary += `\n*+${remaining} cases*`;
        }
      }

      this.guildLogs.log(LogType.MEMBER_JOIN_WITH_PRIOR_RECORDS, {
        member: stripObjectToScalars(member, ["user"]),
        recentCaseSummary,
      });
    }
  }

  @d.event("guildMemberRemove")
  onMemberLeave(_, member) {
    this.guildLogs.log(LogType.MEMBER_LEAVE, {
      member: stripObjectToScalars(member, ["user"]),
    });
  }

  @d.event("guildBanAdd")
  async onMemberBan(_, user) {
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_ADD,
      user.id,
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : unknownUser;

    this.guildLogs.log(
      LogType.MEMBER_BAN,
      {
        user: stripObjectToScalars(user),
        mod: stripObjectToScalars(mod),
      },
      user.id,
    );
  }

  @d.event("guildBanRemove")
  async onMemberUnban(_, user) {
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_REMOVE,
      user.id,
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : unknownUser;

    this.guildLogs.log(
      LogType.MEMBER_UNBAN,
      {
        mod: stripObjectToScalars(mod),
        userId: user.id,
      },
      user.id,
    );
  }

  @d.event("guildMemberUpdate")
  async onMemberUpdate(_, member: Member, oldMember: Member) {
    if (!oldMember) return;

    if (member.nick !== oldMember.nick) {
      this.guildLogs.log(LogType.MEMBER_NICK_CHANGE, {
        member,
        oldNick: oldMember.nick != null ? oldMember.nick : "<none>",
        newNick: member.nick != null ? member.nick : "<none>",
      });
    }

    if (!isEqual(oldMember.roles, member.roles)) {
      const addedRoles = diff(member.roles, oldMember.roles);
      const removedRoles = diff(oldMember.roles, member.roles);

      const relevantAuditLogEntry = await findRelevantAuditLogEntry(
        this.guild,
        ErisConstants.AuditLogActions.MEMBER_ROLE_UPDATE,
        member.id,
      );
      const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : unknownUser;

      if (addedRoles.length && removedRoles.length) {
        // Roles added *and* removed
        this.guildLogs.log(
          LogType.MEMBER_ROLE_CHANGES,
          {
            member,
            addedRoles: addedRoles
              .map(roleId => this.guild.roles.get(roleId))
              .map(r => r.name)
              .join(", "),
            removedRoles: removedRoles
              .map(roleId => this.guild.roles.get(roleId))
              .map(r => r.name)
              .join(", "),
            mod: stripObjectToScalars(mod),
          },
          member.id,
        );
      } else if (addedRoles.length) {
        // Roles added
        this.guildLogs.log(
          LogType.MEMBER_ROLE_ADD,
          {
            member,
            roles: addedRoles
              .map(roleId => this.guild.roles.get(roleId))
              .map(r => r.name)
              .join(", "),
            mod: stripObjectToScalars(mod),
          },
          member.id,
        );
      } else if (removedRoles.length && !addedRoles.length) {
        // Roles removed
        this.guildLogs.log(
          LogType.MEMBER_ROLE_REMOVE,
          {
            member,
            roles: removedRoles
              .map(roleId => this.guild.roles.get(roleId))
              .map(r => r.name)
              .join(", "),
            mod: stripObjectToScalars(mod),
          },
          member.id,
        );
      }
    }
  }

  @d.event("userUpdate")
  onUserUpdate(user: User, oldUser: User) {
    if (!oldUser) return;

    if (user.username !== oldUser.username || user.discriminator !== oldUser.discriminator) {
      const member = this.guild.members.get(user.id) || { id: user.id, user };
      this.guildLogs.log(LogType.MEMBER_USERNAME_CHANGE, {
        member: stripObjectToScalars(member, ["user"]),
        oldName: `${oldUser.username}#${oldUser.discriminator}`,
        newName: `${user.username}#${user.discriminator}`,
      });
    }
  }

  @d.event("channelCreate")
  onChannelCreate(channel) {
    this.guildLogs.log(LogType.CHANNEL_CREATE, {
      channel: stripObjectToScalars(channel),
    });
  }

  @d.event("channelDelete")
  onChannelDelete(channel) {
    this.guildLogs.log(LogType.CHANNEL_DELETE, {
      channel: stripObjectToScalars(channel),
    });
  }

  @d.event("guildRoleCreate")
  onRoleCreate(_, role) {
    this.guildLogs.log(LogType.ROLE_CREATE, {
      role: stripObjectToScalars(role),
    });
  }

  @d.event("guildRoleDelete")
  onRoleDelete(_, role) {
    this.guildLogs.log(LogType.ROLE_DELETE, {
      role: stripObjectToScalars(role),
    });
  }

  // Uses events from savesMessages
  onMessageUpdate(savedMessage: SavedMessage, oldSavedMessage: SavedMessage) {
    // Don't log edits from the bot user
    if (savedMessage.user_id === this.bot.user.id) return;

    if (oldSavedMessage && JSON.stringify(savedMessage.data) === JSON.stringify(oldSavedMessage.data)) return;

    const member = this.guild.members.get(savedMessage.user_id);
    const channel = this.guild.channels.get(savedMessage.channel_id);

    const before = oldSavedMessage
      ? disableCodeBlocks(deactivateMentions(oldSavedMessage.data.content || ""))
      : "Unknown pre-edit content";
    const after = disableCodeBlocks(deactivateMentions(savedMessage.data.content || ""));

    this.guildLogs.log(LogType.MESSAGE_EDIT, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel),
      before,
      after,
    });
  }

  // Uses events from savesMessages
  onMessageDelete(savedMessage: SavedMessage) {
    // Don't log deletions from the bot user
    if (savedMessage.user_id === this.bot.user.id) return;

    const member = this.guild.members.get(savedMessage.user_id);
    const channel = this.guild.channels.get(savedMessage.channel_id);

    if (member) {
      const attachments = savedMessage.data.attachments
        ? "\nAttachments:\n" + savedMessage.data.attachments.map((a: any) => a.url).join("\n")
        : "";

      this.guildLogs.log(
        LogType.MESSAGE_DELETE,
        {
          member: stripObjectToScalars(member, ["user"]),
          channel: stripObjectToScalars(channel),
          messageText: disableCodeBlocks(deactivateMentions(savedMessage.data.content || "<no text content>")),
          messageDate: moment(savedMessage.data.timestamp, "x").format(this.getConfig().format.timestamp),
          attachments: disableLinkPreviews(useMediaUrls(attachments)),
        },
        savedMessage.id,
      );
    } else {
      this.guildLogs.log(
        LogType.MESSAGE_DELETE_BARE,
        {
          messageId: savedMessage.id,
          channel: stripObjectToScalars(channel),
        },
        savedMessage.id,
      );
    }
  }

  // Uses events from savesMessages
  async onMessageDeleteBulk(savedMessages: SavedMessage[]) {
    const channel = this.guild.channels.get(savedMessages[0].channel_id);
    const archiveId = await this.archives.createFromSavedMessages(savedMessages, this.guild);
    const archiveUrl = this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId);

    this.guildLogs.log(
      LogType.MESSAGE_DELETE_BULK,
      {
        count: savedMessages.length,
        channel,
        archiveUrl,
      },
      savedMessages[0].id,
    );
  }

  @d.event("voiceChannelJoin")
  onVoiceChannelJoin(member: Member, channel: Channel) {
    this.guildLogs.log(LogType.VOICE_CHANNEL_JOIN, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel),
    });
  }

  @d.event("voiceChannelLeave")
  onVoiceChannelLeave(member: Member, channel: Channel) {
    this.guildLogs.log(LogType.VOICE_CHANNEL_LEAVE, {
      member: stripObjectToScalars(member, ["user"]),
      channel: stripObjectToScalars(channel),
    });
  }

  @d.event("voiceChannelSwitch")
  onVoiceChannelSwitch(member: Member, newChannel: Channel, oldChannel: Channel) {
    this.guildLogs.log(LogType.VOICE_CHANNEL_MOVE, {
      member: stripObjectToScalars(member, ["user"]),
      oldChannel: stripObjectToScalars(oldChannel),
      newChannel: stripObjectToScalars(newChannel),
    });
  }
}
