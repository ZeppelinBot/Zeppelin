import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { StarboardMessage } from "./entities/StarboardMessage";

export class GuildStarboardMessages extends BaseGuildRepository {
  private allStarboardMessages: Repository<StarboardMessage>;

  constructor(guildId) {
    super(guildId);
    this.allStarboardMessages = getRepository(StarboardMessage);
  }

  async getStarboardMessagesForMessageId(messageId: string) {
    return this.allStarboardMessages
      .createQueryBuilder()
      .where("guild_id = :gid", { gid: this.guildId })
      .andWhere("message_id = :msgid", { msgid: messageId })
      .getMany();
  }

  async getStarboardMessagesForStarboardMessageId(starboardMessageId: string) {
    return this.allStarboardMessages
      .createQueryBuilder()
      .where("guild_id = :gid", { gid: this.guildId })
      .andWhere("starboard_message_id = :messageId", { messageId: starboardMessageId })
      .getMany();
  }

  async getMatchingStarboardMessages(starboardChannelId: string, sourceMessageId: string) {
    return this.allStarboardMessages
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .andWhere("message_id = :msgId", { msgId: sourceMessageId })
      .andWhere("starboard_channel_id = :channelId", { channelId: starboardChannelId })
      .getMany();
  }

  async createStarboardMessage(starboardId: string, messageId: string, starboardMessageId: string) {
    await this.allStarboardMessages.insert({
      message_id: messageId,
      starboard_message_id: starboardMessageId,
      starboard_channel_id: starboardId,
      guild_id: this.guildId,
    });
  }

  async deleteStarboardMessage(starboardMessageId: string, starboardChannelId: string) {
    await this.allStarboardMessages.delete({
      guild_id: this.guildId,
      starboard_message_id: starboardMessageId,
      starboard_channel_id: starboardChannelId,
    });
  }
}
