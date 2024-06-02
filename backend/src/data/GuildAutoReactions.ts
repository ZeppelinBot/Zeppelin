import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { dataSource } from "./dataSource.js";
import { AutoReaction } from "./entities/AutoReaction.js";

export class GuildAutoReactions extends BaseGuildRepository {
  private autoReactions: Repository<AutoReaction>;

  constructor(guildId) {
    super(guildId);
    this.autoReactions = dataSource.getRepository(AutoReaction);
  }

  async all(): Promise<AutoReaction[]> {
    return this.autoReactions.find({
      where: {
        guild_id: this.guildId,
      },
    });
  }

  async getForChannel(channelId: string): Promise<AutoReaction | null> {
    return this.autoReactions.findOne({
      where: {
        guild_id: this.guildId,
        channel_id: channelId,
      },
    });
  }

  async removeFromChannel(channelId: string) {
    await this.autoReactions.delete({
      guild_id: this.guildId,
      channel_id: channelId,
    });
  }

  async set(channelId: string, reactions: string[]) {
    const existingRecord = await this.getForChannel(channelId);
    if (existingRecord) {
      this.autoReactions.update(
        {
          guild_id: this.guildId,
          channel_id: channelId,
        },
        {
          reactions,
        },
      );
    } else {
      await this.autoReactions.insert({
        guild_id: this.guildId,
        channel_id: channelId,
        reactions,
      });
    }
  }
}
