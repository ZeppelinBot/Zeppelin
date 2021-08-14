import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { PersistedData } from "./entities/PersistedData";

export interface IPartialPersistData {
  roles?: string[];
  nickname?: string;
}

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

  async set(userId: string, data: IPartialPersistData = {}) {
    const finalData: any = {};
    if (data.roles) finalData.roles = data.roles.join(",");
    if (data.nickname) finalData.nickname = data.nickname;

    const existing = await this.find(userId);
    if (existing) {
      await this.persistedData.update(
        {
          guild_id: this.guildId,
          user_id: userId,
        },
        finalData,
      );
    } else {
      await this.persistedData.insert({
        ...finalData,
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
