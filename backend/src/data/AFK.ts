import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository } from "typeorm";
import { AFK as AFKEntity } from "./entities/AFK";

export class AFK extends BaseRepository {
  private afk: Repository<AFKEntity>;

  constructor() {
    super();
    this.afk = getRepository(AFKEntity);
  }

  async getUserAFKStatus(user_id: string) {
    return await this.afk.findOne({ user_id });
  }

  async setAfkStatus(user_id: string, status: string) {
    const settings = new AFKEntity();
    settings.user_id = user_id;
    settings.status = status;

    return await this.afk.save(settings);
  }

  async clearAFKStatus(user_id: string) {
    const afk = await this.afk.findOne({ user_id });
    if (!afk) return;

    return await this.afk.delete({ user_id });
  }

  async isAfk(user_id: string) {
    const afk = await this.afk.findOne({ user_id });
    return !!afk?.status;
  }
}
