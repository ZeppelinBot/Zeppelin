import { AllowedGuild } from "./entities/AllowedGuild";
import {
  getConnection,
  getRepository,
  Repository,
  Transaction,
  TransactionManager,
  TransactionRepository,
} from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { BaseRepository } from "./BaseRepository";

export class AllowedGuilds extends BaseRepository {
  private allowedGuilds: Repository<AllowedGuild>;

  constructor() {
    super();
    this.allowedGuilds = getRepository(AllowedGuild);
  }

  async isAllowed(guildId) {
    const count = await this.allowedGuilds.count({
      where: {
        guild_id: guildId,
      },
    });
    return count !== 0;
  }

  getForDashboardUser(userId) {
    return this.allowedGuilds
      .createQueryBuilder("allowed_guilds")
      .innerJoin(
        "dashboard_users",
        "dashboard_users",
        "dashboard_users.guild_id = allowed_guilds.guild_id AND dashboard_users.user_id = :userId",
        { userId },
      )
      .getMany();
  }
}
