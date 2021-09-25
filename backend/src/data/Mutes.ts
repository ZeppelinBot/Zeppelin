import moment from "moment-timezone";
import { Brackets, getRepository, Repository } from "typeorm";
import { Mute } from "./entities/Mute";
import { DBDateFormat } from "../utils";
import { BaseRepository } from "./BaseRepository";

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
}
