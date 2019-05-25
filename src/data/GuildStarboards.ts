import { BaseGuildRepository } from "./BaseGuildRepository";
import { getRepository, Repository } from "typeorm";
import { Starboard } from "./entities/Starboard";
import { StarboardMessage } from "./entities/StarboardMessage";

export class GuildStarboards extends BaseGuildRepository {
  private starboards: Repository<Starboard>;
  private starboardMessages: Repository<StarboardMessage>;

  constructor(guildId) {
    super(guildId);
    this.starboards = getRepository(Starboard);
    this.starboardMessages = getRepository(StarboardMessage);
  }

  getStarboardByChannelId(channelId): Promise<Starboard> {
    return this.starboards.findOne({
      where: {
        guild_id: this.guildId,
        channel_id: channelId,
      },
    });
  }

  getStarboardsByEmoji(emoji): Promise<Starboard[]> {
    return this.starboards.find({
      where: {
        guild_id: this.guildId,
        emoji,
      },
    });
  }

  getStarboardMessageByStarboardIdAndMessageId(starboardId, messageId): Promise<StarboardMessage> {
    return this.starboardMessages.findOne({
      relations: this.getRelations(),
      where: {
        starboard_id: starboardId,
        message_id: messageId,
      },
    });
  }

  getStarboardMessagesByMessageId(id): Promise<StarboardMessage[]> {
    return this.starboardMessages.find({
      relations: this.getRelations(),
      where: {
        message_id: id,
      },
    });
  }

  async createStarboardMessage(starboardId, messageId, starboardMessageId): Promise<void> {
    await this.starboardMessages.insert({
      starboard_id: starboardId,
      message_id: messageId,
      starboard_message_id: starboardMessageId,
    });
  }

  async deleteStarboardMessage(starboardId, messageId): Promise<void> {
    await this.starboardMessages.delete({
      starboard_id: starboardId,
      message_id: messageId,
    });
  }

  async create(channelId: string, channelWhitelist: string[], emoji: string, reactionsRequired: number): Promise<void> {
    await this.starboards.insert({
      guild_id: this.guildId,
      channel_id: channelId,
      channel_whitelist: channelWhitelist ? channelWhitelist.join(",") : null,
      emoji,
      reactions_required: reactionsRequired,
    });
  }

  async delete(channelId: string): Promise<void> {
    await this.starboards.delete({
      guild_id: this.guildId,
      channel_id: channelId,
    });
  }
}
