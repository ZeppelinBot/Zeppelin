import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { StarboardReaction } from "./entities/StarboardReaction";

export class GuildStarboardReactions extends BaseGuildRepository {
  private allStarboardReactions: Repository<StarboardReaction>;

  constructor(guildId) {
    super(guildId);
    this.allStarboardReactions = getRepository(StarboardReaction);
  }

  async getAllReactionsForMessageId(messageId: string) {
    return this.allStarboardReactions
      .createQueryBuilder()
      .where("guild_id = :gid", { gid: this.guildId })
      .andWhere("message_id = :msgid", { msgid: messageId })
      .getMany();
  }

  async createStarboardReaction(messageId: string, reactorId: string) {
    const existingReaction = await this.allStarboardReactions.findOne({
      where: {
        guild_id: this.guildId,
        message_id: messageId,
        reactor_id: reactorId,
      },
    });

    if (existingReaction) {
      return;
    }

    await this.allStarboardReactions.insert({
      guild_id: this.guildId,
      message_id: messageId,
      reactor_id: reactorId,
    });
  }

  async deleteAllStarboardReactionsForMessageId(messageId: string) {
    await this.allStarboardReactions.delete({
      guild_id: this.guildId,
      message_id: messageId,
    });
  }

  async deleteStarboardReaction(messageId: string, reactorId: string) {
    await this.allStarboardReactions.delete({
      guild_id: this.guildId,
      reactor_id: reactorId,
      message_id: messageId,
    });
  }
}
