import { Plugin, decorators as d } from "knub";
import { CustomEmoji, errorMessage, isSnowflake } from "../utils";
import { GuildReactionRoles } from "../data/GuildReactionRoles";
import { Channel, Message, TextChannel } from "eris";

type ReactionRolePair = [string, string];

export class ReactionRolesPlugin extends Plugin {
  public static pluginName = "reaction_roles";

  protected reactionRoles: GuildReactionRoles;

  getDefaultOptions() {
    return {
      permissions: {
        manage: false
      },

      overrides: [
        {
          level: ">=100",
          permissions: {
            manage: true
          }
        }
      ]
    };
  }

  async onLoad() {
    this.reactionRoles = GuildReactionRoles.getInstance(this.guildId);
    return;

    // Pre-fetch all messages with reaction roles so we get their events
    const reactionRoles = await this.reactionRoles.all();

    const channelMessages: Map<string, Set<string>> = reactionRoles.reduce((map: Map<string, Set<string>>, row) => {
      if (!map.has(row.channel_id)) map.set(row.channel_id, new Set());
      map.get(row.channel_id).add(row.message_id);
      return map;
    }, new Map());

    const msgLoadPromises = [];

    for (const [channelId, messageIdSet] of channelMessages.entries()) {
      const messageIds = Array.from(messageIdSet.values());
      const channel = (await this.guild.channels.get(channelId)) as TextChannel;
      if (!channel) continue;

      for (const messageId of messageIds) {
        msgLoadPromises.push(channel.getMessage(messageId));
      }
    }

    await Promise.all(msgLoadPromises);
  }

  @d.command("reaction_roles", "<channel:channel> <messageId:string> <reactionRolePairs:string$>")
  @d.permission("manage")
  async reactionRolesCmd(msg: Message, args: { channel: Channel; messageId: string; reactionRolePairs: string }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel must be a text channel!"));
      return;
    }

    const targetMessage = await args.channel.getMessage(args.messageId);
    if (!targetMessage) {
      args.channel.createMessage(errorMessage("Unknown message!"));
      return;
    }

    const guildEmojis = this.guild.emojis as CustomEmoji[];
    const guildEmojiIds = guildEmojis.map(e => e.id);

    // Turn "emoji = role" pairs into an array of tuples of the form [emoji, roleId]
    // Emoji is either a unicode emoji or the snowflake of a custom emoji
    const newRolePairs: ReactionRolePair[] = args.reactionRolePairs
      .trim()
      .split("\n")
      .map(v => v.split("=").map(v => v.trim())) // tslint:disable-line
      .map(
        (pair): ReactionRolePair => {
          const customEmojiMatch = pair[0].match(/^<:(.*?):(\d+)>$/);
          if (customEmojiMatch) {
            return [`${customEmojiMatch[1]}:${customEmojiMatch[2]}`, pair[1]];
          } else {
            return pair as ReactionRolePair;
          }
        }
      );

    // Verify the specified emojis and roles are valid
    for (const pair of newRolePairs) {
      if (isSnowflake(pair[0]) && !guildEmojiIds.includes(pair[0])) {
        msg.channel.createMessage(errorMessage("I can only use regular emojis and custom emojis from this server"));
        return;
      }

      if (!this.guild.roles.has(pair[1])) {
        msg.channel.createMessage(errorMessage(`Unknown role ${pair[1]}`));
        return;
      }
    }

    const oldReactionRoles = await this.reactionRoles.getForMessage(targetMessage.id);
    const oldRolePairs: ReactionRolePair[] = oldReactionRoles.map(r => [r.emoji, r.role_id] as ReactionRolePair);

    // Remove old reaction/role pairs that weren't included in the new pairs or were changed in some way
    const toRemove = oldRolePairs.filter(
      pair => !newRolePairs.find(oldPair => oldPair[0] === pair[0] && oldPair[1] === pair[1])
    );
    for (const rolePair of toRemove) {
      await this.reactionRoles.removeFromMessage(targetMessage.id, rolePair[0]);

      for (const reaction of Object.values(targetMessage.reactions)) {
        if (reaction.emoji.id === rolePair[0] || reaction.emoji.name === rolePair[0]) {
          reaction.remove(this.bot.user.id);
        }
      }
    }

    // Add new/changed reaction/role pairs
    const toAdd = newRolePairs.filter(
      pair => !oldRolePairs.find(oldPair => oldPair[0] === pair[0] && oldPair[1] === pair[1])
    );
    for (const rolePair of toAdd) {
      let emoji;

      if (isSnowflake(rolePair[0])) {
        // Custom emoji
        const guildEmoji = guildEmojis.find(e => e.id === emoji.id);
        emoji = `${guildEmoji.name}:${guildEmoji.id}`;
      } else {
        // Unicode emoji
        emoji = rolePair[0];
      }

      await targetMessage.addReaction(emoji);
      await this.reactionRoles.add(args.channel.id, targetMessage.id, rolePair[0], rolePair[1]);
    }
  }

  @d.event("messageReactionAdd")
  async onAddReaction(msg: Message, emoji: CustomEmoji, userId: string) {
    const matchingReactionRole = await this.reactionRoles.getByMessageAndEmoji(msg.id, emoji.id || emoji.name);
    if (!matchingReactionRole) return;

    const member = this.guild.members.get(userId);
    if (!member) return;

    member.addRole(matchingReactionRole.role_id);
  }

  @d.event("messageReactionRemove")
  async onRemoveReaction(msg: Message, emoji: CustomEmoji, userId: string) {
    const matchingReactionRole = await this.reactionRoles.getByMessageAndEmoji(msg.id, emoji.id || emoji.name);
    if (!matchingReactionRole) return;

    const member = this.guild.members.get(userId);
    if (!member) return;

    member.removeRole(matchingReactionRole.role_id);
  }
}
