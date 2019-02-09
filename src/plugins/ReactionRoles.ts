import { decorators as d } from "knub";
import { CustomEmoji, errorMessage, isSnowflake, successMessage } from "../utils";
import { GuildReactionRoles } from "../data/GuildReactionRoles";
import { Channel, Message, TextChannel } from "eris";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { GuildSavedMessages } from "../data/GuildSavedMessages";

type ReactionRolePair = [string, string, string?];

export class ReactionRolesPlugin extends ZeppelinPlugin {
  public static pluginName = "reaction_roles";

  protected reactionRoles: GuildReactionRoles;
  protected savedMessages: GuildSavedMessages;

  getDefaultOptions() {
    return {
      permissions: {
        manage: false,
      },

      overrides: [
        {
          level: ">=100",
          permissions: {
            manage: true,
          },
        },
      ],
    };
  }

  async onLoad() {
    this.reactionRoles = GuildReactionRoles.getInstance(this.guildId);
    this.savedMessages = GuildSavedMessages.getInstance(this.guildId);
  }

  @d.command("reaction_roles clear", "<messageId:string>")
  @d.permission("manage")
  async clearReactionRolesCmd(msg: Message, args: { messageId: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    const existingReactionRoles = this.reactionRoles.getForMessage(args.messageId);
    if (!existingReactionRoles) {
      msg.channel.createMessage(errorMessage("Message doesn't have reaction roles on it"));
      return;
    }

    this.reactionRoles.removeFromMessage(args.messageId);

    const channel = this.guild.channels.get(savedMessage.channel_id) as TextChannel;
    const targetMessage = await channel.getMessage(savedMessage.id);
    await targetMessage.removeReactions();

    msg.channel.createMessage(successMessage("Reaction roles cleared"));
  }

  @d.command("reaction_roles", "<messageId:string> <reactionRolePairs:string$>")
  @d.permission("manage")
  async reactionRolesCmd(msg: Message, args: { messageId: string; reactionRolePairs: string }) {
    const savedMessage = await this.savedMessages.find(args.messageId);
    if (!savedMessage) {
      msg.channel.createMessage(errorMessage("Unknown message"));
      return;
    }

    const channel = await this.guild.channels.get(savedMessage.channel_id);
    if (!channel || !(channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Channel no longer exists"));
      return;
    }

    const targetMessage = await channel.getMessage(args.messageId);
    if (!targetMessage) {
      msg.channel.createMessage(errorMessage("Unknown message (2)"));
      return;
    }

    // Turn "emoji = role" pairs into an array of tuples of the form [emoji, roleId]
    // Emoji is either a unicode emoji or the snowflake of a custom emoji
    const newRolePairs: ReactionRolePair[] = args.reactionRolePairs
      .trim()
      .split("\n")
      .map(v => v.split("=").map(v => v.trim())) // tslint:disable-line
      .map(
        (pair): ReactionRolePair => {
          const customEmojiMatch = pair[0].match(/^<a?:(.*?):(\d+)>$/);
          if (customEmojiMatch) {
            return [customEmojiMatch[2], pair[1], customEmojiMatch[1]];
          } else {
            return pair as ReactionRolePair;
          }
        },
      );

    // Verify the specified emojis and roles are valid
    for (const pair of newRolePairs) {
      if (!this.canUseEmoji(pair[0])) {
        msg.channel.createMessage(errorMessage("I can only use regular emojis and custom emojis from servers I'm on"));
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
      pair => !newRolePairs.find(oldPair => oldPair[0] === pair[0] && oldPair[1] === pair[1]),
    );
    for (const rolePair of toRemove) {
      await this.reactionRoles.removeFromMessage(targetMessage.id, rolePair[0]);

      for (const emoji of Object.keys(targetMessage.reactions)) {
        const emojiId = emoji.includes(":") ? emoji.split(":")[1] : emoji;

        if (emojiId === rolePair[0]) {
          targetMessage.removeReaction(emoji, this.bot.user.id);
        }
      }
    }

    // Add new/changed reaction/role pairs
    const toAdd = newRolePairs.filter(
      pair => !oldRolePairs.find(oldPair => oldPair[0] === pair[0] && oldPair[1] === pair[1]),
    );
    for (const rolePair of toAdd) {
      let emoji;

      if (rolePair[2]) {
        // Custom emoji
        emoji = `${rolePair[2]}:${rolePair[0]}`;
      } else {
        // Unicode emoji
        emoji = rolePair[0];
      }

      await targetMessage.addReaction(emoji);
      await this.reactionRoles.add(channel.id, targetMessage.id, rolePair[0], rolePair[1]);
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
