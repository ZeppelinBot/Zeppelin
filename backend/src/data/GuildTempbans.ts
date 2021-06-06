import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { Tempban } from "./entities/Tempban";

export class GuildTempbans extends BaseGuildRepository {
  private tempbans: Repository<Tempban>;

  constructor(guildId) {
    super(guildId);
    this.tempbans = getRepository(Tempban);
  }

  async getExpiredTempbans(): Promise<Tempban[]> {
    return this.tempbans
      .createQueryBuilder("mutes")
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= NOW()")
      .getMany();
  }

  async findExistingTempbanForUserId(userId: string): Promise<Tempban | undefined> {
    return this.tempbans.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  async addTempban(userId, expiryTime, modId): Promise<Tempban> {
    const expiresAt = moment
      .utc()
      .add(expiryTime, "ms")
      .format("YYYY-MM-DD HH:mm:ss");

    const result = await this.tempbans.insert({
      guild_id: this.guildId,
      user_id: userId,
      mod_id: modId,
      expires_at: expiresAt,
      created_at: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
    });

    return (await this.tempbans.findOne({ where: result.identifiers[0] }))!;
  }

  async updateExpiryTime(userId, newExpiryTime, modId) {
    const expiresAt = moment
      .utc()
      .add(newExpiryTime, "ms")
      .format("YYYY-MM-DD HH:mm:ss");

    return this.tempbans.update(
      {
        guild_id: this.guildId,
        user_id: userId,
      },
      {
        created_at: moment.utc().format("YYYY-MM-DD HH:mm:ss"),
        expires_at: expiresAt,
        mod_id: modId,
      },
    );
  }

  async clear(userId) {
    await this.tempbans.delete({
      guild_id: this.guildId,
      user_id: userId,
    });
  }
}
