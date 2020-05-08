import { decorators as d, IPluginOptions, logger } from "knub";
import { GuildSavedMessages } from "../data/GuildSavedMessages";
import { SavedMessage } from "../data/entities/SavedMessage";
import { GuildAutoReactions } from "../data/GuildAutoReactions";
import { Message } from "eris";
import { customEmojiRegex, errorMessage, isEmoji } from "../utils";
import { CommandInfo, trimPluginDescription, ZeppelinPlugin } from "./ZeppelinPlugin";
import DiscordRESTError = require("eris/lib/errors/DiscordRESTError.js"); // tslint:disable-line
import * as t from "io-ts";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";

const ConfigSchema = t.type({
  can_manage: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class AutoReactionsPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "auto_reactions";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Auto-reactions",
    description: trimPluginDescription(`
      Allows setting up automatic reactions to all new messages on a channel
    `),
  };

  protected savedMessages: GuildSavedMessages;
  protected autoReactions: GuildAutoReactions;
  protected logs: GuildLogs;

  private onMessageCreateFn;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        can_manage: false,
      },

      overrides: [
        {
          level: ">=100",
          config: {
            can_manage: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.logs = new GuildLogs(this.guildId);
    this.savedMessages = GuildSavedMessages.getGuildInstance(this.guildId);
    this.autoReactions = GuildAutoReactions.getGuildInstance(this.guildId);

    this.onMessageCreateFn = this.savedMessages.events.on("create", this.onMessageCreate.bind(this));
  }

  onUnload() {
    this.savedMessages.events.off("create", this.onMessageCreateFn);
  }

  @d.command("auto_reactions", "<channelId:channelId> <reactions...>", {
    extra: {
      info: <CommandInfo>{
        basicUsage: "!auto_reactions 629990160477585428 👍 👎",
      },
    },
  })
  @d.permission("can_manage")
  async setAutoReactionsCmd(msg: Message, args: { channelId: string; reactions: string[] }) {
    const finalReactions = [];

    for (const reaction of args.reactions) {
      if (!isEmoji(reaction)) {
        msg.channel.createMessage(errorMessage("One or more of the specified reactions were invalid!"));
        return;
      }

      let savedValue;

      const customEmojiMatch = reaction.match(customEmojiRegex);
      if (customEmojiMatch) {
        // Custom emoji
        if (!this.canUseEmoji(customEmojiMatch[2])) {
          msg.channel.createMessage(errorMessage("I can only use regular emojis and custom emojis from this server"));
          return;
        }

        savedValue = `${customEmojiMatch[1]}:${customEmojiMatch[2]}`;
      } else {
        // Unicode emoji
        savedValue = reaction;
      }

      finalReactions.push(savedValue);
    }

    await this.autoReactions.set(args.channelId, finalReactions);
    this.sendSuccessMessage(msg.channel, `Auto-reactions set for <#${args.channelId}>`);
  }

  @d.command("auto_reactions disable", "<channelId:channelId>", {
    extra: {
      info: <CommandInfo>{
        basicUsage: "!auto_reactions disable 629990160477585428",
      },
    },
  })
  @d.permission("can_manage")
  async disableAutoReactionsCmd(msg: Message, args: { channelId: string }) {
    const autoReaction = await this.autoReactions.getForChannel(args.channelId);
    if (!autoReaction) {
      msg.channel.createMessage(errorMessage(`Auto-reactions aren't enabled in <#${args.channelId}>`));
      return;
    }

    await this.autoReactions.removeFromChannel(args.channelId);
    this.sendSuccessMessage(msg.channel, `Auto-reactions disabled in <#${args.channelId}>`);
  }

  async onMessageCreate(msg: SavedMessage) {
    const autoReaction = await this.autoReactions.getForChannel(msg.channel_id);
    if (!autoReaction) return;

    let realMsg;
    try {
      realMsg = await this.bot.getMessage(msg.channel_id, msg.id);
    } catch (e) {
      if (e instanceof DiscordRESTError) {
        logger.warn(
          `Could not load auto-reaction message ${msg.channel_id}/${msg.id} in guild ${this.guild.name} (${this.guildId}) (error code ${e.code})`,
        );

        if (e.code === 50001) {
          // Missing access
          this.logs.log(LogType.BOT_ALERT, {
            body: `Could not load auto-reaction message \`${msg.id}\` in <#${msg.channel_id}>. Make sure the bot has **Read Message History** permissions on the channel.`,
          });
        } else if (e.code === 10008) {
          this.logs.log(LogType.BOT_ALERT, {
            body: `Could not load auto-reaction message \`${msg.id}\` in <#${msg.channel_id}>. Make sure nothing is deleting the message immediately.`,
          });
        } else {
          this.logs.log(LogType.BOT_ALERT, {
            body: `Could not load auto-reaction message \`${msg.id}\` in <#${msg.channel_id}>. Error code ${e.code}.`,
          });
        }
        return;
      } else {
        throw e;
      }
    }

    for (const reaction of autoReaction.reactions) {
      try {
        await realMsg.addReaction(reaction);
      } catch (e) {
        if (e instanceof DiscordRESTError) {
          logger.warn(
            `Could not apply auto-reaction to ${msg.channel_id}/${msg.id} in guild ${this.guild.name} (${this.guildId}) (error code ${e.code})`,
          );

          if (e.code === 10008) {
            this.logs.log(LogType.BOT_ALERT, {
              body: `Could not apply auto-reactions in <#${msg.channel_id}> for message \`${msg.id}\`. Make sure nothing is deleting the message before the reactions are applied.`,
            });
          } else {
            this.logs.log(LogType.BOT_ALERT, {
              body: `Could not apply auto-reactions in <#${msg.channel_id}> for message \`${msg.id}\`. Error code ${e.code}.`,
            });
          }

          return;
        } else {
          throw e;
        }
      }
    }
  }
}
