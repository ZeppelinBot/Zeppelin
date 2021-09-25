import { getRepository, Repository } from "typeorm";
import { VCAlert } from "./entities/VCAlert";
import { BaseRepository } from "./BaseRepository";
import moment from "moment-timezone";
import { DBDateFormat } from "../utils";

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
