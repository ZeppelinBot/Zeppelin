import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { PersistedData } from "./entities/PersistedData";

export class GuildPersistedData extends BaseGuildRepository {
  private persistedData: Repository<PersistedData>;

  constructor(guildId) {
    super(guildId);
    this.persistedData = getRepository(PersistedData);
  }

  async find(userId: string) {
    return this.persistedData.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  async set(userId: string, data: Partial<PersistedData> = {}) {
    const existing = await this.find(userId);
    if (existing) {
      await this.persistedData.update(
        {
          guild_id: this.guildId,
          user_id: userId,
        },
        data,
      );
    } else {
      await this.persistedData.insert({
        ...data,
        guild_id: this.guildId,
        user_id: userId,
      });
    }
  }

  async clear(userId: string) {
    await this.persistedData.delete({
      guild_id: this.guildId,
      user_id: userId,
    });
  }
}
