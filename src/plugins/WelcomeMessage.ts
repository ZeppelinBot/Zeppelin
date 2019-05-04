import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { decorators as d, IPluginOptions } from "knub";
import { Member, TextChannel } from "eris";
import { renderTemplate } from "../templateFormatter";
import { createChunkedMessage, stripObjectToScalars } from "../utils";
import { LogType } from "../data/LogType";
import { GuildLogs } from "../data/GuildLogs";

interface IWelcomeMessageConfig {
  send_dm: boolean;
  send_to_channel: string;
  message: string;
}

export class WelcomeMessagePlugin extends ZeppelinPlugin<IWelcomeMessageConfig> {
  public static pluginName = "welcome_message";

  protected logs: GuildLogs;

  protected getDefaultOptions(): IPluginOptions<IWelcomeMessageConfig> {
    return {
      config: {
        send_dm: false,
        send_to_channel: null,
        message: null,
      },
    };
  }

  protected onLoad() {
    this.logs = new GuildLogs(this.guildId);
  }

  @d.event("guildMemberAdd")
  async onGuildMemberAdd(_, member: Member) {
    const config = this.getConfig();
    if (!config.message) return;
    if (!config.send_dm && !config.send_to_channel) return;

    const formatted = await renderTemplate(config.message, {
      member: stripObjectToScalars(member, ["user"]),
    });

    if (config.send_dm) {
      const dmChannel = await member.user.getDMChannel();
      if (!dmChannel) return;

      try {
        createChunkedMessage(dmChannel, formatted);
      } catch (e) {
        this.logs.log(LogType.BOT_ALERT, {
          body: `Failed send a welcome DM to {userMention(member)}`,
          member: stripObjectToScalars(member),
        });
      }
    }

    if (config.send_to_channel) {
      const channel = this.guild.channels.get(config.send_to_channel);
      if (!channel || !(channel instanceof TextChannel)) return;

      try {
        createChunkedMessage(channel, formatted);
      } catch (e) {
        this.logs.log(LogType.BOT_ALERT, {
          body: `Failed send a welcome message for {userMention(member)} to {channelMention(channel)}`,
          member: stripObjectToScalars(member),
          channel: stripObjectToScalars(channel),
        });
      }
    }
  }
}
