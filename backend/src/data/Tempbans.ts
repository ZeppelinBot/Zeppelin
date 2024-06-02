import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DBDateFormat } from "../utils.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { Tempban } from "./entities/Tempban.js";

export class Tempbans extends BaseRepository {
  private tempbans: Repository<Tempban>;

  constructor() {
    super();
    this.tempbans = dataSource.getRepository(Tempban);
  }

  getSoonExpiringTempbans(threshold: number): Promise<Tempban[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.tempbans.createQueryBuilder().where("expires_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
