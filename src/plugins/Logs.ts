import { decorators as d, IPluginOptions, logger } from "knub";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { Attachment, Channel, Constants as ErisConstants, Embed, Member, TextChannel, User } from "eris";
import {
  createChunkedMessage,
  deactivateMentions,
  disableCodeBlocks,
  disableLinkPreviews,
  findRelevantAuditLogEntry,
  noop,
  stripObjectToScalars,
  trimLines,
  UnknownUser,
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
import { renderTemplate, TemplateParseError } from "../templateFormatter";
import cloneDeep from "lodash.clonedeep";
import * as t from "io-ts";

const LogChannel = t.partial({
  include: t.array(t.string),
  exclude: t.array(t.string),
  batched: t.boolean,
  batch_time: t.number,
  excluded_users: t.array(t.string),
});
type TLogChannel = t.TypeOf<typeof LogChannel>;

const LogChannelMap = t.record(t.string, LogChannel);
type TLogChannelMap = t.TypeOf<typeof LogChannelMap>;

const ConfigSchema = t.type({
  channels: LogChannelMap,
  format: t.intersection([
    t.record(t.string, t.string),
    t.type({
      timestamp: t.string,
    }),
  ]),
  ping_user: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class LogsPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "logs";
  protected static configSchema = ConfigSchema;

  protected guildLogs: GuildLogs;
  protected savedMessages: GuildSavedMessages;
  protected archives: GuildArchives;
  protected cases: GuildCases;

  protected logListener;

  protected batches: Map<string, string[]>;

  private onMessageDeleteFn;
  private onMessageDeleteBulkFn;
  private onMessageUpdateFn;

  private excludedUserProps = ["user", "member", "mod"];

  getDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        channels: {},
        format: {
          timestamp: "YYYY-MM-DD HH:mm:ss",
          ...DefaultLogMessages,
        },
        ping_user: true,
      },

      overrides: [
        {
          level: ">=50",
          config: {
            ping_user: false,
          },
        },
      ],
    };
  }

  onLoad() {
    this.guildLogs = new GuildLogs(this.guildId);
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.archives = GuildArchives.getGuildInstance(this.guildId);
    this.cases = GuildCases.getGuildInstance(this.guildId);

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
    const logChannels: TLogChannelMap = this.getConfig().channels;
    const typeStr = LogType[type];

    logChannelLoop: for (const [channelId, opts] of Object.entries(logChannels)) {
      const channel = this.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;

      if ((opts.include && opts.include.includes(typeStr)) || (opts.exclude && !opts.exclude.includes(typeStr))) {
        // If this log entry is about an excluded user, skip it
        // TODO: Quick and dirty solution, look into changing at some point
        if (opts.excluded_users) {
          for (const prop of this.excludedUserProps) {
            if (data && data[prop] && opts.excluded_users.includes(data[prop].id)) {
              continue logChannelLoop;
            }
          }
        }

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

    let formatted;
    try {
      const values = {
        ...data,
        userMention: async userOrMember => {
          if (!userOrMember) return "";

          let user;
          let member;

          if (userOrMember.user) {
            member = userOrMember;
            user = member.user;
          } else {
            user = userOrMember;
            member = this.guild.members.get(user.id) || { id: user.id, user };
          }

          const memberConfig = this.getMatchingConfig({ member, userId: user.id }) || ({} as any);

          if (memberConfig.ping_user) {
            // Ping/mention the user
            return `<@!${user.id}> (**${user.username}#${user.discriminator}**, \`${user.id}\`)`;
          } else {
            // No ping/mention
            return `**${user.username}#${user.discriminator}** (\`${user.id}\`)`;
          }
        },
        channelMention: channel => {
          if (!channel) return "";
          return `<#${channel.id}> (**#${channel.name}**, \`${channel.id}\`)`;
        },
        messageSummary: (msg: SavedMessage) => {
          // Regular text content
          let result = "```" + (msg.data.content ? disableCodeBlocks(msg.data.content) : "<no text content>") + "```";

          // Rich embed
          const richEmbed = (msg.data.embeds || []).find(e => (e as Embed).type === "rich");
          if (richEmbed) result += "Embed:```" + disableCodeBlocks(JSON.stringify(richEmbed)) + "```";

          // Attachments
          if (msg.data.attachments) {
            result +=
              "Attachments:\n" +
              msg.data.attachments.map((a: Attachment) => disableLinkPreviews(a.url)).join("\n") +
              "\n";
          }

          return result;
        },
      };

      if (type === LogType.BOT_ALERT) {
        const valuesWithoutTmplEval = { ...values };
        values.tmplEval = str => {
          return renderTemplate(str, valuesWithoutTmplEval);
        };
      }

      formatted = await renderTemplate(format, values);
    } catch (e) {
      if (e instanceof TemplateParseError) {
        logger.error(`Error when parsing template:\nError: ${e.message}\nTemplate: ${format}`);
        return;
      } else {
        throw e;
      }
    }

    formatted = formatted.trim();

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
      member: stripObjectToScalars(member, ["user", "roles"]),
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
        member: stripObjectToScalars(member, ["user", "roles"]),
        recentCaseSummary,
      });
    }
  }

  @d.event("guildMemberRemove")
  onMemberLeave(_, member) {
    this.guildLogs.log(LogType.MEMBER_LEAVE, {
      member: stripObjectToScalars(member, ["user", "roles"]),
    });
  }

  @d.event("guildBanAdd")
  async onMemberBan(_, user) {
    const relevantAuditLogEntry = await findRelevantAuditLogEntry(
      this.guild,
      ErisConstants.AuditLogActions.MEMBER_BAN_ADD,
      user.id,
    );
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : new UnknownUser();

    this.guildLogs.log(
      LogType.MEMBER_BAN,
      {
        mod: stripObjectToScalars(mod),
        user: stripObjectToScalars(user),
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
    const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : new UnknownUser();

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
      const mod = relevantAuditLogEntry ? relevantAuditLogEntry.user : new UnknownUser();

      if (addedRoles.length && removedRoles.length) {
        // Roles added *and* removed
        this.guildLogs.log(
          LogType.MEMBER_ROLE_CHANGES,
          {
            member,
            addedRoles: addedRoles
              .map(roleId => this.guild.roles.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
              .map(r => r.name)
              .join(", "),
            removedRoles: removedRoles
              .map(roleId => this.guild.roles.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
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
              .map(roleId => this.guild.roles.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
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
              .map(roleId => this.guild.roles.get(roleId) || { id: roleId, name: `Unknown (${roleId})` })
              .map(r => r.name)
              .join(", "),
            mod: stripObjectToScalars(mod),
          },
          member.id,
        );
      }
    }
  }

  @d.event("userUpdate", null, false)
  async onUserUpdate(user: User, oldUser: User) {
    if (!oldUser) return;

    if (!this.guild.members.has(user.id)) return;

    if (user.username !== oldUser.username || user.discriminator !== oldUser.discriminator) {
      this.guildLogs.log(LogType.MEMBER_USERNAME_CHANGE, {
        user: stripObjectToScalars(user),
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
  async onMessageUpdate(savedMessage: SavedMessage, oldSavedMessage: SavedMessage) {
    // To log a message update, either the message content or a rich embed has to change
    let logUpdate = false;

    const oldEmbedsToCompare = ((oldSavedMessage.data.embeds || []) as Embed[])
      .map(e => cloneDeep(e))
      .filter(e => (e as Embed).type === "rich");

    const newEmbedsToCompare = ((savedMessage.data.embeds || []) as Embed[])
      .map(e => cloneDeep(e))
      .filter(e => (e as Embed).type === "rich");

    for (const embed of [...oldEmbedsToCompare, ...newEmbedsToCompare]) {
      if (embed.thumbnail) {
        delete embed.thumbnail.width;
        delete embed.thumbnail.height;
      }

      if (embed.image) {
        delete embed.image.width;
        delete embed.image.height;
      }
    }

    if (
      oldSavedMessage.data.content !== savedMessage.data.content ||
      oldEmbedsToCompare.length !== newEmbedsToCompare.length ||
      JSON.stringify(oldEmbedsToCompare) !== JSON.stringify(newEmbedsToCompare)
    ) {
      logUpdate = true;
    }

    if (!logUpdate) {
      return;
    }

    const user = await this.resolveUser(savedMessage.user_id);
    const channel = this.guild.channels.get(savedMessage.channel_id);

    this.guildLogs.log(LogType.MESSAGE_EDIT, {
      user: stripObjectToScalars(user),
      channel: stripObjectToScalars(channel),
      before: oldSavedMessage,
      after: savedMessage,
    });
  }

  // Uses events from savesMessages
  async onMessageDelete(savedMessage: SavedMessage) {
    const user = await this.resolveUser(savedMessage.user_id);
    const channel = this.guild.channels.get(savedMessage.channel_id);

    if (user) {
      // Replace attachment URLs with media URLs
      if (savedMessage.data.attachments) {
        for (const attachment of savedMessage.data.attachments as Attachment[]) {
          attachment.url = useMediaUrls(attachment.url);
        }
      }

      this.guildLogs.log(
        LogType.MESSAGE_DELETE,
        {
          user: stripObjectToScalars(user),
          channel: stripObjectToScalars(channel),
          messageDate: moment(savedMessage.data.timestamp, "x").format(this.getConfig().format.timestamp),
          message: savedMessage,
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
      member: stripObjectToScalars(member, ["user", "roles"]),
      channel: stripObjectToScalars(channel),
    });
  }

  @d.event("voiceChannelLeave")
  onVoiceChannelLeave(member: Member, channel: Channel) {
    this.guildLogs.log(LogType.VOICE_CHANNEL_LEAVE, {
      member: stripObjectToScalars(member, ["user", "roles"]),
      channel: stripObjectToScalars(channel),
    });
  }

  @d.event("voiceChannelSwitch")
  onVoiceChannelSwitch(member: Member, newChannel: Channel, oldChannel: Channel) {
    this.guildLogs.log(LogType.VOICE_CHANNEL_MOVE, {
      member: stripObjectToScalars(member, ["user", "roles"]),
      oldChannel: stripObjectToScalars(oldChannel),
      newChannel: stripObjectToScalars(newChannel),
    });
  }
}
