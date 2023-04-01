import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { DAYS, DBDateFormat } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { Mute } from "./entities/Mute";

const OLD_EXPIRED_MUTE_THRESHOLD = 7 * DAYS;

export class Mutes extends BaseRepository {
  private mutes: Repository<Mute>;

  constructor() {
    super();
    this.mutes = getRepository(Mute);
  }

  async getSoonExpiringMutes(threshold: number): Promise<Mute[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.mutes
      .createQueryBuilder("mutes")
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= :date", { date: thresholdDateStr })
      .getMany();
  }

  async clearOldExpiredMutes(): Promise<void> {
    const thresholdDateStr = moment.utc().subtract(OLD_EXPIRED_MUTE_THRESHOLD, "ms").format(DBDateFormat);
    await this.mutes
      .createQueryBuilder("mutes")
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= :date", { date: thresholdDateStr })
      .delete()
      .execute();
  }
}
