import { decorators as d, IPluginOptions } from "knub";
import child_process from "child_process";
import { GuildChannel, Message, TextChannel } from "eris";
import moment from "moment-timezone";
import { createChunkedMessage, errorMessage, noop, sorter, successMessage, tNullable } from "../utils";
import { ReactionRolesPlugin } from "./ReactionRoles";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildArchives } from "../data/GuildArchives";
import { GlobalZeppelinPlugin } from "./GlobalZeppelinPlugin";
import * as t from "io-ts";

let activeReload: [string, string] = null;

const ConfigSchema = t.type({
  can_use: t.boolean,
  owners: t.array(t.string),
  update_cmd: tNullable(t.string),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

/**
 * A global plugin that allows bot owners to control the bot
 */
export class BotControlPlugin extends GlobalZeppelinPlugin<TConfigSchema> {
  public static pluginName = "bot_control";
  public static configSchema = ConfigSchema;

  protected archives: GuildArchives;

  public static getStaticDefaultOptions() {
    return {
      config: {
        can_use: false,
        owners: [],
        update_cmd: null,
      },
      overrides: [
        {
          level: ">=100",
          config: {
            can_use: true,
          },
        },
      ],
    };
  }

  protected getMemberLevel(member) {
    return this.isOwner(member.id) ? 100 : 0;
  }

  async onLoad() {
    this.archives = new GuildArchives(0);

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

  @d.command("bot_full_update")
  @d.permission("can_use")
  async fullUpdateCmd(msg: Message) {
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
  @d.permission("can_use")
  async reloadGlobalPluginsCmd(msg: Message) {
    if (activeReload) return;

    if (msg.channel) {
      activeReload = [(msg.channel as GuildChannel).guild.id, msg.channel.id];
      await msg.channel.createMessage("Reloading global plugins...");
    }

    this.knub.reloadAllGlobalPlugins();
  }

  @d.command("perf")
  @d.permission("can_use")
  async perfCmd(msg: Message) {
    const perfItems = this.knub.getPerformanceDebugItems();

    if (perfItems.length) {
      const content = "```" + perfItems.join("\n") + "```";
      msg.channel.createMessage(content);
    } else {
      msg.channel.createMessage(errorMessage("No performance data"));
    }
  }

  @d.command("refresh_reaction_roles_globally")
  @d.permission("can_use")
  async refreshAllReactionRolesCmd(msg: Message) {
    const guilds = this.knub.getLoadedGuilds();
    for (const guild of guilds) {
      if (guild.loadedPlugins.has("reaction_roles")) {
        const rrPlugin = (guild.loadedPlugins.get("reaction_roles") as unknown) as ReactionRolesPlugin;
        rrPlugin.runAutoRefresh().catch(noop);
      }
    }
  }

  @d.command("guilds")
  @d.permission("can_use")
  async serversCmd(msg: Message) {
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
  @d.permission("can_use")
  async leaveGuildCmd(msg: Message, args: { guildId: string }) {
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
  @d.permission("can_use")
  async reloadGuildCmd(msg: Message, args: { guildId: string }) {
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
  @d.permission("can_use")
  async reloadAllGuilds(msg: Message) {
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

  @d.command("show_plugin_config", "<guildId:string> <pluginName:string>")
  @d.permission("can_use")
  async showPluginConfig(msg: Message, args: { guildId: string; pluginName: string }) {
    const guildData = this.knub.getGuildData(args.guildId);
    if (!guildData) {
      msg.channel.createMessage(errorMessage(`Guild not loaded`));
      return;
    }

    const pluginInstance = guildData.loadedPlugins.get(args.pluginName);
    if (!pluginInstance) {
      msg.channel.createMessage(errorMessage(`Plugin not loaded`));
      return;
    }

    if (!(pluginInstance instanceof ZeppelinPlugin)) {
      msg.channel.createMessage(errorMessage(`Plugin is not a Zeppelin plugin`));
      return;
    }

    const opts = pluginInstance.getRuntimeOptions();
    const archiveId = await this.archives.create(JSON.stringify(opts, null, 2), moment().add(15, "minutes"));
    msg.channel.createMessage(this.archives.getUrl(this.knub.getGlobalConfig().url, archiveId));
  }
}
