import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
import { DBDateFormat } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { Reminder } from "./entities/Reminder";

export class Reminders extends BaseRepository {
  private reminders: Repository<Reminder>;

  constructor() {
    super();
    this.reminders = getRepository(Reminder);
  }

  async getRemindersDueSoon(threshold: number): Promise<Reminder[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.reminders.createQueryBuilder().andWhere("remind_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
