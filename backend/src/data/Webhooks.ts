import { Repository } from "typeorm";
import { decrypt, encrypt } from "../utils/crypt.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { Webhook } from "./entities/Webhook.js";

export class Webhooks extends BaseRepository {
  repository: Repository<Webhook> = dataSource.getRepository(Webhook);

  protected async _processEntityFromDB(entity) {
    entity.token = await decrypt(entity.token);
    return entity;
  }

  protected async _processEntityToDB(entity) {
    entity.token = await encrypt(entity.token);
    return entity;
  }

  async find(id: string): Promise<Webhook | null> {
    const result = await this.repository.findOne({
      where: {
        id,
      },
    });

    return result ? this._processEntityFromDB(result) : null;
  }

  async findByChannelId(channelId: string): Promise<Webhook | null> {
    const result = await this.repository.findOne({
      where: {
        channel_id: channelId,
      },
    });

    return result ? this.processEntityFromDB(result) : null;
  }

  async create(data: Partial<Webhook>): Promise<void> {
    data = await this.processEntityToDB(data);
    await this.repository.insert(data);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
