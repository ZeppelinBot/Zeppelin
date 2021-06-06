import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { AntiraidLevel } from "./entities/AntiraidLevel";

export class GuildAntiraidLevels extends BaseGuildRepository {
  protected antiraidLevels: Repository<AntiraidLevel>;

  constructor(guildId: string) {
    super(guildId);
    this.antiraidLevels = getRepository(AntiraidLevel);
  }

  async get() {
    const row = await this.antiraidLevels.findOne({
      where: {
        guild_id: this.guildId,
      },
    });

    return row?.level ?? null;
  }

  async set(level: string | null) {
    if (level === null) {
      await this.antiraidLevels.delete({
        guild_id: this.guildId,
      });
    } else {
      // Upsert: https://stackoverflow.com/a/47064558/316944
      // But the MySQL version: https://github.com/typeorm/typeorm/issues/1090#issuecomment-634391487
      await this.antiraidLevels
        .createQueryBuilder()
        .insert()
        .values({
          guild_id: this.guildId,
          level,
        })
        .orUpdate({
          conflict_target: ["guild_id"],
          overwrite: ["level"],
        })
        .execute();
    }
  }
}
