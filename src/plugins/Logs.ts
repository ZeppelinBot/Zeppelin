import { Plugin } from "knub";
import { GuildServerLogs } from "../data/GuildServerLogs";
import { LogType } from "../data/LogType";
import { TextChannel } from "eris";
import { formatTemplateString } from "../utils";
import DefaultLogMessages from "../data/DefaultLogMessages.json";
import moment from "moment-timezone";

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
          ...DefaultLogMessages
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
