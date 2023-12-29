import { Repository } from "typeorm/index";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { dataSource } from "./dataSource";
import { MemberTimezone } from "./entities/MemberTimezone";

export class GuildMemberTimezones extends BaseGuildRepository {
  protected memberTimezones: Repository<MemberTimezone>;

  constructor(guildId: string) {
    super(guildId);
    this.memberTimezones = dataSource.getRepository(MemberTimezone);
  }

  get(memberId: string) {
    return this.memberTimezones.findOne({
      where: {
        guild_id: this.guildId,
        member_id: memberId,
      },
    });
  }

  async set(memberId, timezone: string) {
    await dataSource.transaction(async (entityManager) => {
      const repo = entityManager.getRepository(MemberTimezone);
      const existingRow = await repo.findOne({
        where: {
          guild_id: this.guildId,
          member_id: memberId,
        },
      });

      if (existingRow) {
        await repo.update(
          {
            guild_id: this.guildId,
            member_id: memberId,
          },
          {
            timezone,
          },
        );
      } else {
        await repo.insert({
          guild_id: this.guildId,
          member_id: memberId,
          timezone,
        });
      }
    });
  }

  reset(memberId: string) {
    return this.memberTimezones.delete({
      guild_id: this.guildId,
      member_id: memberId,
    });
  }
}
