import { Plugin } from "knub";
import { GuildServerLogs } from "../data/GuildServerLogs";
import { LogType } from "../data/LogType";
import { TextChannel } from "eris";
import { formatTemplateString } from "../utils";
import * as moment from "moment-timezone";

interface ILogChannel {
  include?: LogType[];
  exclude?: LogType[];
}

interface ILogChannelMap {
  [channelId: string]: ILogChannel;
}

export class LogsPlugin extends Plugin {
  protected serverLogs: GuildServerLogs;
  protected logListener;

  getDefaultOptions() {
    return {
      config: {
        channels: {},
        format: {
          timestamp: "HH:mm:ss",
          MEMBER_WARN:
            "⚠️ **{member.user.username}#{member.user.discriminator}** (`{member.id}`) was warned by {mod.user.username}#{mod.user.discriminator}",
          MEMBER_MUTE:
            "🔇 **{member.user.username}#{member.user.discriminator}** (`{member.id}`) was muted by {mod.user.username}#{mod.user.discriminator}",
          MEMBER_UNMUTE:
            "🔉 **{member.user.username}#{member.user.discriminator}** was unmuted",
          MEMBER_KICK:
            "👢 **{member.user.username}#{member.user.discriminator}** (`{member.id}`) was kicked by {mod.user.username}#{mod.user.discriminator}",
          MEMBER_BAN:
            "🔨 **{member.user.username}#{member.user.discriminator}** (`{member.id}`) was banned by {mod.user.username}#{mod.user.discriminator}",
          MEMBER_JOIN:
            "📥 **{member.user.username}#{member.user.discriminator}** (`{member.id}`) joined{new} (created {account_age})",
          MEMBER_LEAVE:
            "📤 **{member.user.username}#{member.user.discriminator}** left the server",
          MEMBER_ROLE_ADD:
            "🔑 **{member.user.username}#{member.user.discriminator}** role added **{role.name}** by {mod.user.username}#{mod.user.discriminator}",
          MEMBER_ROLE_REMOVE:
            "🔑 **{member.user.username}#{member.user.discriminator}** role removed **{role.name}** by {mod.user.username}#{mod.user.discriminator}"
        }
      }
    };
  }

  onLoad() {
    this.serverLogs = new GuildServerLogs(this.guildId);

    this.logListener = ({ type, data }) => this.log(type, data);
    this.serverLogs.on("log", this.logListener);
  }

  onUnload() {
    this.serverLogs.removeListener("log", this.logListener);
  }

  log(type, data) {
    const logChannels: ILogChannelMap = this.configValue("channels");
    for (const [channelId, opts] of Object.entries(logChannels)) {
      const channel = this.guild.channels.get(channelId);
      if (!channel || !(channel instanceof TextChannel)) continue;

      if (
        (opts.include && opts.include.includes(type)) ||
        (opts.exclude && !opts.exclude.includes(type))
      ) {
        const message = this.getLogMessage(type, data);
        if (message) channel.createMessage(message);
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
}
