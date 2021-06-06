import { getRepository, Repository } from "typeorm/index";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { connection } from "./db";
import { MemberTimezone } from "./entities/MemberTimezone";

export class GuildMemberTimezones extends BaseGuildRepository {
  protected memberTimezones: Repository<MemberTimezone>;

  constructor(guildId: string) {
    super(guildId);
    this.memberTimezones = getRepository(MemberTimezone);
  }

  get(memberId: string) {
    return this.memberTimezones.findOne({
      guild_id: this.guildId,
      member_id: memberId,
    });
  }

  async set(memberId, timezone: string) {
    await connection.transaction(async entityManager => {
      const repo = entityManager.getRepository(MemberTimezone);
      const existingRow = await repo.findOne({
        guild_id: this.guildId,
        member_id: memberId,
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
