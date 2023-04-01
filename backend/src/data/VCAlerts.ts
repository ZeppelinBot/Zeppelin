import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { DBDateFormat } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { VCAlert } from "./entities/VCAlert";

export class VCAlerts extends BaseRepository {
  private allAlerts: Repository<VCAlert>;

  constructor() {
    super();
    this.allAlerts = getRepository(VCAlert);
  }

  async getSoonExpiringAlerts(threshold: number): Promise<VCAlert[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.allAlerts.createQueryBuilder().andWhere("expires_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
