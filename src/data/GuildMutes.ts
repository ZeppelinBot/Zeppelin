import moment from "moment-timezone";
import { Mute } from "./entities/Mute";
import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository, Brackets } from "typeorm";

export class GuildMutes extends BaseRepository {
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

  async findExistingMuteForUserId(userId: string): Promise<Mute> {
    return this.mutes.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId
      }
    });
  }

  async addMute(userId, expiryTime): Promise<Mute> {
    const expiresAt = expiryTime
      ? moment()
          .add(expiryTime, "ms")
          .format("YYYY-MM-DD HH:mm:ss")
      : null;

    const result = await this.mutes.insert({
      guild_id: this.guildId,
      user_id: userId,
      expires_at: expiresAt
    });

    return this.mutes.findOne({ where: result.identifiers[0] });
  }

  async updateExpiryTime(userId, newExpiryTime) {
    const expiresAt = newExpiryTime
      ? moment()
          .add(newExpiryTime, "ms")
          .format("YYYY-MM-DD HH:mm:ss")
      : null;

    return this.mutes.update(
      {
        guild_id: this.guildId,
        user_id: userId
      },
      {
        expires_at: expiresAt
      }
    );
  }

  async addOrUpdateMute(userId, expiryTime): Promise<Mute> {
    const existingMute = await this.findExistingMuteForUserId(userId);

    if (existingMute) {
      await this.updateExpiryTime(userId, expiryTime);
      return this.findExistingMuteForUserId(userId);
    } else {
      return this.addMute(userId, expiryTime);
    }
  }

  async getActiveMutes(): Promise<Mute[]> {
    return this.mutes
      .createQueryBuilder("mutes")
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere(
        new Brackets(qb => {
          qb.where("expires_at > NOW()").orWhere("expires_at IS NULL");
        })
      )
      .getMany();
  }

  async setCaseId(userId: string, caseId: number) {
    await this.mutes.update(
      {
        guild_id: this.guildId,
        user_id: userId
      },
      {
        case_id: caseId
      }
    );
  }

  async clear(userId) {
    await this.mutes.delete({
      guild_id: this.guildId,
      user_id: userId
    });
  }
}
