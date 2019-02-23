import { decorators as d, GlobalPlugin } from "knub";
import child_process from "child_process";
import { GuildChannel, Message, TextChannel } from "eris";
import { errorMessage, sleep, successMessage } from "../utils";
import { ReactionRolesPlugin } from "./ReactionRoles";

let activeReload: [string, string] = null;

/**
 * A global plugin that allows bot owners to control the bot
 */
export class BotControlPlugin extends GlobalPlugin {
  public static pluginName = "bot_control";

  getDefaultOptions() {
    return {
      config: {
        owners: [],
      },
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

  @d.command("perf")
  async perfCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;
    const perfItems = this.knub.getPerformanceDebugItems();

    if (perfItems.length) {
      const content = "```" + perfItems.join("\n") + "```";
      msg.channel.createMessage(content);
    } else {
      msg.channel.createMessage(errorMessage("No performance data"));
    }
  }

  @d.command("refresh_reaction_roles_globally")
  async refreshAllReactionRolesCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;

    const guilds = this.knub.getLoadedGuilds();
    for (const guild of guilds) {
      if (guild.loadedPlugins.has("reaction_roles")) {
        const rrPlugin = guild.loadedPlugins.get("reaction_roles") as ReactionRolesPlugin;
        rrPlugin.runAutoRefresh();
      }
    }
  }
}
