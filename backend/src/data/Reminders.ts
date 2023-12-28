import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DBDateFormat } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { dataSource } from "./dataSource";
import { Reminder } from "./entities/Reminder";

export class Reminders extends BaseRepository {
  private reminders: Repository<Reminder>;

  constructor() {
    super();
    this.reminders = dataSource.getRepository(Reminder);
  }

  async getRemindersDueSoon(threshold: number): Promise<Reminder[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.reminders.createQueryBuilder().andWhere("remind_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
