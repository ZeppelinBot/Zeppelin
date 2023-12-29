import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DBDateFormat } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { dataSource } from "./dataSource";
import { Tempban } from "./entities/Tempban";

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
