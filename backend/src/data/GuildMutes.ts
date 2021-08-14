import moment from "moment-timezone";
import { Brackets, getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { Mute } from "./entities/Mute";

export class GuildMutes extends BaseGuildRepository {
  private mutes: Repository<Mute>;

  constructor(guildId) {
    super(guildId);
    this.mutes = getRepository(Mute);
  }

  async getExpiredMutes(): Promise<Mute[]> {
    return this.mutes
      .createQueryBuilder("mutes")
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= NOW()")
      .getMany();
  }

  async findExistingMuteForUserId(userId: string): Promise<Mute | undefined> {
    return this.mutes.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  async isMuted(userId: string): Promise<boolean> {
    const mute = await this.findExistingMuteForUserId(userId);
    return mute != null;
  }

  async addMute(userId, expiryTime, rolesToRestore?: string[]): Promise<Mute> {
    const expiresAt = expiryTime
      ? moment
          .utc()
          .add(expiryTime, "ms")
          .format("YYYY-MM-DD HH:mm:ss")
      : null;

    const result = await this.mutes.insert({
      guild_id: this.guildId,
      user_id: userId,
      expires_at: expiresAt,
      roles_to_restore: rolesToRestore ?? [],
    });

    return (await this.mutes.findOne({ where: result.identifiers[0] }))!;
  }

  async updateExpiryTime(userId, newExpiryTime, rolesToRestore?: string[]) {
    const expiresAt = newExpiryTime
      ? moment
          .utc()
          .add(newExpiryTime, "ms")
          .format("YYYY-MM-DD HH:mm:ss")
      : null;

    if (rolesToRestore && rolesToRestore.length) {
      return this.mutes.update(
        {
          guild_id: this.guildId,
          user_id: userId,
        },
        {
          expires_at: expiresAt,
          roles_to_restore: rolesToRestore,
        },
      );
    } else {
      return this.mutes.update(
        {
          guild_id: this.guildId,
          user_id: userId,
        },
        {
          expires_at: expiresAt,
        },
      );
    }
  }

  async getActiveMutes(): Promise<Mute[]> {
    return this.mutes
      .createQueryBuilder("mutes")
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere(
        new Brackets(qb => {
          qb.where("expires_at > NOW()").orWhere("expires_at IS NULL");
        }),
      )
      .getMany();
  }

  async setCaseId(userId: string, caseId: number) {
    await this.mutes.update(
      {
        guild_id: this.guildId,
        user_id: userId,
      },
      {
        case_id: caseId,
      },
    );
  }

  async clear(userId) {
    await this.mutes.delete({
      guild_id: this.guildId,
      user_id: userId,
    });
  }
}
