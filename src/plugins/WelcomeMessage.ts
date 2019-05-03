import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { decorators as d, IPluginOptions } from "knub";
import { Member, TextChannel } from "eris";
import { renderTemplate } from "../templateFormatter";
import { createChunkedMessage, stripObjectToScalars } from "../utils";

interface IWelcomeMessageConfig {
  send_dm: boolean;
  send_to_channel: string;
  message: string;
}

export class WelcomeMessagePlugin extends ZeppelinPlugin<IWelcomeMessageConfig> {
  public static pluginName = "welcome_message";

  protected getDefaultOptions(): IPluginOptions<IWelcomeMessageConfig> {
    return {
      config: {
        send_dm: false,
        send_to_channel: null,
        message: null,
      },
    };
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
      } catch (e) {} // tslint:disable-line
    }

    if (config.send_to_channel) {
      const channel = this.guild.channels.get(config.send_to_channel);
      if (!channel || !(channel instanceof TextChannel)) return;

      try {
        createChunkedMessage(channel, formatted);
      } catch (e) {} // tslint:disable-line
    }
  }
}
