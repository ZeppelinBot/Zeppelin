import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { dataSource } from "./dataSource.js";
import { ReactionRole } from "./entities/ReactionRole.js";

export class GuildReactionRoles extends BaseGuildRepository {
  private reactionRoles: Repository<ReactionRole>;

  constructor(guildId) {
    super(guildId);
    this.reactionRoles = dataSource.getRepository(ReactionRole);
  }

  async all(): Promise<ReactionRole[]> {
    return this.reactionRoles.find({
      where: {
        guild_id: this.guildId,
      },
    });
  }

  async getForMessage(messageId: string): Promise<ReactionRole[]> {
    return this.reactionRoles.find({
      where: {
        guild_id: this.guildId,
        message_id: messageId,
      },
      order: {
        order: "ASC",
      },
    });
  }

  async getByMessageAndEmoji(messageId: string, emoji: string): Promise<ReactionRole | null> {
    return this.reactionRoles.findOne({
      where: {
        guild_id: this.guildId,
        message_id: messageId,
        emoji,
      },
    });
  }

  async removeFromMessage(messageId: string, emoji?: string) {
    const criteria: any = {
      guild_id: this.guildId,
      message_id: messageId,
    };

    if (emoji) {
      criteria.emoji = emoji;
    }

    await this.reactionRoles.delete(criteria);
  }

  async add(
    channelId: string,
    messageId: string,
    emoji: string,
    roleId: string,
    exclusive?: boolean,
    position?: number,
  ) {
    await this.reactionRoles.insert({
      guild_id: this.guildId,
      channel_id: channelId,
      message_id: messageId,
      emoji,
      role_id: roleId,
      is_exclusive: Boolean(exclusive),
      order: position,
    });
  }
}
