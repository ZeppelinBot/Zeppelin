import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository.js";
import { dataSource } from "./dataSource.js";
import { StatValue } from "./entities/StatValue.js";

export class GuildStats extends BaseGuildRepository {
  private stats: Repository<StatValue>;

  constructor(guildId) {
    super(guildId);
    this.stats = dataSource.getRepository(StatValue);
  }

  async saveValue(source: string, key: string, value: number): Promise<void> {
    await this.stats.insert({
      guild_id: this.guildId,
      source,
      key,
      value,
    });
  }

  async deleteOldValues(source: string, cutoff: string): Promise<void> {
    await this.stats
      .createQueryBuilder()
      .where("source = :source", { source })
      .andWhere("created_at < :cutoff", { cutoff })
      .delete();
  }
}
