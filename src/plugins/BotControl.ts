import { decorators as d, GlobalPlugin, IPluginOptions } from "knub";
import child_process from "child_process";
import { GuildChannel, Message, TextChannel } from "eris";
import { createChunkedMessage, errorMessage, noop, sorter, successMessage } from "../utils";
import { ReactionRolesPlugin } from "./ReactionRoles";

let activeReload: [string, string] = null;

interface IBotControlPluginConfig {
  owners: string[];
  update_cmd: string;
}

/**
 * A global plugin that allows bot owners to control the bot
 */
export class BotControlPlugin extends GlobalPlugin<IBotControlPluginConfig> {
  public static pluginName = "bot_control";

  getDefaultOptions(): IPluginOptions<IBotControlPluginConfig> {
    return {
      config: {
        owners: [],
        update_cmd: null,
      },

      permissions: {},
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
    return this.getConfig().owners.includes(userId);
  }

  @d.command("bot_full_update")
  async fullUpdateCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;

    const updateCmd = this.getConfig().update_cmd;
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
        const rrPlugin = (guild.loadedPlugins.get("reaction_roles") as unknown) as ReactionRolesPlugin;
        rrPlugin.runAutoRefresh().catch(noop);
      }
    }
  }

  @d.command("guilds")
  async serversCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;

    const joinedGuilds = Array.from(this.bot.guilds.values());
    const loadedGuilds = this.knub.getLoadedGuilds();
    const loadedGuildsMap = loadedGuilds.reduce((map, guildData) => map.set(guildData.id, guildData), new Map());

    joinedGuilds.sort(sorter(g => g.name.toLowerCase()));
    const longestId = joinedGuilds.reduce((longest, guild) => Math.max(longest, guild.id.length), 0);
    const lines = joinedGuilds.map(g => {
      const paddedId = g.id.padEnd(longestId, " ");
      return `\`${paddedId}\` **${g.name}** (${loadedGuildsMap.has(g.id) ? "initialized" : "not initialized"}) (${
        g.memberCount
      } members)`;
    });
    createChunkedMessage(msg.channel, lines.join("\n"));
  }

  @d.command("leave_guild", "<guildId:string>")
  async leaveGuildCmd(msg: Message, args: { guildId: string }) {
    if (!this.isOwner(msg.author.id)) return;

    if (!this.bot.guilds.has(args.guildId)) {
      msg.channel.createMessage(errorMessage("I am not in that guild"));
      return;
    }

    const guildToLeave = this.bot.guilds.get(args.guildId);
    const guildName = guildToLeave.name;

    try {
      await this.bot.leaveGuild(args.guildId);
    } catch (e) {
      msg.channel.createMessage(errorMessage(`Failed to leave guild: ${e.message}`));
      return;
    }

    msg.channel.createMessage(successMessage(`Left guild **${guildName}**`));
  }

  @d.command("reload_guild", "<guildId:string>")
  async reloadGuildCmd(msg: Message, args: { guildId: string }) {
    if (!this.isOwner(msg.author.id)) return;

    if (!this.bot.guilds.has(args.guildId)) {
      msg.channel.createMessage(errorMessage("I am not in that guild"));
      return;
    }

    try {
      await this.knub.reloadGuild(args.guildId);
    } catch (e) {
      msg.channel.createMessage(errorMessage(`Failed to reload guild: ${e.message}`));
      return;
    }

    const guild = this.bot.guilds.get(args.guildId);
    msg.channel.createMessage(successMessage(`Reloaded guild **${guild.name}**`));
  }

  @d.command("reload_all_guilds")
  async reloadAllGuilds(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;

    const failedReloads: Map<string, string> = new Map();
    let reloadCount = 0;

    const loadedGuilds = this.knub.getLoadedGuilds();
    for (const guildData of loadedGuilds) {
      try {
        await this.knub.reloadGuild(guildData.id);
        reloadCount++;
      } catch (e) {
        failedReloads.set(guildData.id, e.message);
      }
    }

    if (failedReloads.size) {
      const errorLines = Array.from(failedReloads.entries()).map(([guildId, err]) => {
        const guild = this.bot.guilds.get(guildId);
        const guildName = guild ? guild.name : "Unknown";
        return `${guildName} (${guildId}): ${err}`;
      });
      createChunkedMessage(msg.channel, `Reloaded ${reloadCount} guild(s). Errors:\n${errorLines.join("\n")}`);
    } else {
      msg.channel.createMessage(successMessage(`Reloaded ${reloadCount} guild(s)`));
    }
  }
}
