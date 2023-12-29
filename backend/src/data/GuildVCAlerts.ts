import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { dataSource } from "./dataSource";
import { VCAlert } from "./entities/VCAlert";

export class GuildVCAlerts extends BaseGuildRepository {
  private allAlerts: Repository<VCAlert>;

  constructor(guildId) {
    super(guildId);
    this.allAlerts = dataSource.getRepository(VCAlert);
  }

  async getOutdatedAlerts(): Promise<VCAlert[]> {
    return this.allAlerts
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .andWhere("expires_at <= NOW()")
      .getMany();
  }

  async getAllGuildAlerts(): Promise<VCAlert[]> {
    return this.allAlerts.createQueryBuilder().where("guild_id = :guildId", { guildId: this.guildId }).getMany();
  }

  async getAlertsByUserId(userId: string): Promise<VCAlert[]> {
    return this.allAlerts.find({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  async getAlertsByRequestorId(requestorId: string): Promise<VCAlert[]> {
    return this.allAlerts.find({
      where: {
        guild_id: this.guildId,
        requestor_id: requestorId,
      },
    });
  }

  find(id: number) {
    return this.allAlerts.findOne({
      where: { id },
    });
  }

  async delete(id) {
    await this.allAlerts.delete({
      guild_id: this.guildId,
      id,
    });
  }

  async add(requestorId: string, userId: string, channelId: string, expiresAt: string, body: string, active: boolean) {
    const result = await this.allAlerts.insert({
      guild_id: this.guildId,
      requestor_id: requestorId,
      user_id: userId,
      channel_id: channelId,
      expires_at: expiresAt,
      body,
      active,
    });

    return (await this.find(result.identifiers[0].id))!;
  }
}
