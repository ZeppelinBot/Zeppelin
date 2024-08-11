import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DBDateFormat } from "../utils.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { VCAlert } from "./entities/VCAlert.js";

export class VCAlerts extends BaseRepository {
  private allAlerts: Repository<VCAlert>;

  constructor() {
    super();
    this.allAlerts = dataSource.getRepository(VCAlert);
  }

  async getSoonExpiringAlerts(threshold: number): Promise<VCAlert[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.allAlerts.createQueryBuilder().andWhere("expires_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
