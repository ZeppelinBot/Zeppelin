import { ReactionRole } from "./entities/ReactionRole";
import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository } from "typeorm";

export class GuildReactionRoles extends BaseRepository {
  private reactionRoles: Repository<ReactionRole>;

  constructor(guildId) {
    super(guildId);
    this.reactionRoles = getRepository(ReactionRole);
  }

  async all(): Promise<ReactionRole[]> {
    return this.reactionRoles.find({
      where: {
        guild_id: this.guildId
      }
    });
  }

  async getForMessage(messageId: string): Promise<ReactionRole[]> {
    return this.reactionRoles.find({
      where: {
        guild_id: this.guildId,
        message_id: messageId
      }
    });
  }

  async getByMessageAndEmoji(messageId: string, emoji: string): Promise<ReactionRole> {
    return this.reactionRoles.findOne({
      where: {
        guild_id: this.guildId,
        message_id: messageId,
        emoji
      }
    });
  }

  async removeFromMessage(messageId: string, emoji: string = null) {
    const criteria: any = {
      guild_id: this.guildId,
      message_id: messageId
    };

    if (emoji) {
      criteria.emoji = emoji;
    }

    await this.reactionRoles.delete(criteria);
  }

  async add(channelId: string, messageId: string, emoji: string, roleId: string) {
    await this.reactionRoles.insert({
      guild_id: this.guildId,
      channel_id: channelId,
      message_id: messageId,
      emoji,
      role_id: roleId
    });
  }
}
