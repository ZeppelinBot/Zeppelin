import { decorators as d, GlobalPlugin } from "knub";
import child_process from "child_process";
import { GuildChannel, Message, TextChannel } from "eris";
import { errorMessage, sleep, successMessage } from "../utils";

let activeReload: [string, string] = null;

/**
 * A global plugin that allows bot owners to control the bot
 */
export class BotControlPlugin extends GlobalPlugin {
  getDefaultOptions() {
    return {
      config: {
        owners: []
      }
    };
  }

  async onLoad() {
    if (activeReload) {
      const [guildId, channelId] = activeReload;
      activeReload = null;

      const guild = this.bot.guilds.get(guildId);
      if (guild) {
        const channel = guild.channels.get(channelId);
        if (channel instanceof TextChannel) {
          channel.createMessage(successMessage("Global plugins reloaded!"));
        }
      }
    }
  }

  isOwner(userId) {
    return this.configValue("owners").includes(userId);
  }

  @d.command("bot_full_update")
  async fullUpdateCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;

    const updateCmd = this.configValue("update_cmd");
    if (!updateCmd) {
      msg.channel.createMessage(errorMessage("Update command not specified!"));
      return;
    }

    msg.channel.createMessage("Updating...");
    const updater = child_process.exec(updateCmd, { cwd: process.cwd() });
    updater.stderr.on("data", data => {
      // tslint:disable-next-line
      console.error(data);
    });
  }

  @d.command("bot_reload_global_plugins")
  async reloadGlobalPluginsCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;
    if (activeReload) return;

    if (msg.channel) {
      activeReload = [(msg.channel as GuildChannel).guild.id, msg.channel.id];
      await msg.channel.createMessage("Reloading global plugins...");
    }

    this.knub.reloadAllGlobalPlugins();
  }
}
