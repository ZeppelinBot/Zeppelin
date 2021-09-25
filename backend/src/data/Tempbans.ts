import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { Tempban } from "./entities/Tempban";
import { BaseRepository } from "./BaseRepository";
import { DBDateFormat } from "../utils";

export class Tempbans extends BaseRepository {
  private tempbans: Repository<Tempban>;

  constructor() {
    super();
    this.tempbans = getRepository(Tempban);
  }

  getSoonExpiringTempbans(threshold: number): Promise<Tempban[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.tempbans.createQueryBuilder().where("expires_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
